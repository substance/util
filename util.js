if (typeof Substance === 'undefined') Substance = {};
if (typeof Substance.util === 'undefined') Substance.util = {};

(function(util){

var env = (typeof exports === 'undefined') ? 'composer' : 'hub';
var fs = (env == 'hub') ? require('fs') : fs;

/* TODO: underscore can not be found here?
var _ = (env == 'hub') ? require('underscore') : _;
*/

// Async Control Flow for the Substance
// --------

util.isFunction = function(obj) {
  return ( Object.prototype.toString.call(obj) === '[object Function]');
};

util.isArray = function(obj) {
  return ( Object.prototype.toString.call(obj) === '[object Array]');
};

util.update = function(obj, withObj) {
  for (var key in withObj) {
    obj[key] = withObj[key];
  }
  return obj;
}

util.async = function(funcs, data_or_cb, cb) {
  var data = null;

  // be tolerant - allow to omit the data argument
  if (arguments.length == 2) {
    cb = data_or_cb;
  } else if (arguments.length == 3) {
    data = data_or_cb;
  } else {
      throw "Illegal arguments.";
  }

  if (Object.prototype.toString.call(cb) !== '[object Function]') {
    throw "Illegal arguments: a callback function must be provided";
  }

  if (!data) data = {};

  var index = 0;
  var args = [];

  function process(data) {
    var func = funcs[index];

    // stop if no function is left
    if (!func) {
      return cb(null, data);
    }

    // A function that is used as call back for each function
    // which does the progression in the chain via recursion.
    // On errors the given callback will be called and recursion is stopped.
    var recursiveCallback = function(err, data) {
      // stop on error
      if (err) return cb(err, null);

      index += 1;
      process(data);
    };

    // catch exceptions and propagat
    try {
      func(data, recursiveCallback);
    } catch (err) {
      console.log("util.async caught error:", err.stack);
      cb(err);
    }
  }

  // start processing
  process(data);
}

function util_async_each(options) {
  return function(data, cb) {
    // retrieve items via selector if a selector function is given
    var items = options.selector ? options.selector(data) : options.items;

    // don't do nothing if items is not there
    if (!items) return cb(null, data);

    var isArray = util.isArray(items);

    if (options.before) {
      options.before(data);
    }

    var funcs = [];
    var iterator = options.iterator;

    // TODO: discuss convention for iterator function signatures.
    // trying to achieve a combination of underscore and node.js callback style
    function arrayFunction(item) {
      return function(data, cb) {
        if (iterator.length === 2) {
          iterator(item, cb);
        } else {
          iterator(item, data, cb);
        }
      };
    }

    function objectFunction(value, key) {
      return function(data, cb) {
        if (iterator.length === 2) {
          iterator(value, cb);
        } else if (iterator.length === 3) {
          iterator(value, key, cb);
        } else {
          iterator(value, key, data, cb);
        }
      };
    }

    if (isArray) {
      for (var idx = 0; idx < items.length; idx++) {
        funcs.push(arrayFunction(items[idx]));
      }
    } else {
      for (var key in items) {
        funcs.push(objectFunction(items[key], key));
      }
    }
    //console.log("Iterator:", iterator, "Funcs:", funcs);
    util.async(funcs, data, cb);
  };
}

// Creates an each-iterator for util.async chains
// -----------
//
//     var func = util.async.each(items, function(item, [data,] cb) { ... });
//     var func = util.async.each(options)
//
// options:
//    items:    the items to be iterated
//    selector: used to select items dynamically from the data provided by the previous function in the chain
//    before:   an extra function called before iteration
//    after:    called after iteration
//    iterator: the iterator function (item, [data,] cb)
//       with item: the iterated item,
//            data: the propagated data (optional)
//            cb:   the callback

util.async.each = function(options_or_items, iterator) {
  var options;
  if (arguments.length == 1) {
    options = options_or_items;
  } else {
    options = {
      items: options_or_items,
      iterator: iterator
    }
  }
  return util_async_each(options);
};

// Util to read seed data from file system
// ----------

util.getJSON = function(resource, cb) {
  if (env == 'hub') {
    var obj = JSON.parse(fs.readFileSync(resource, 'utf8'));
    cb(null, obj);
  } else {
    $.getJSON(resource)
      .done(function(obj) { cb(null, obj); })
      .error(function(err) { cb(err, null); });
  }
}

util.loadSeedSpec = function(seedName, cb) {
  var seedsDir = './tests/seeds';

  function loadSpec(data, cb) {
    //console.log("Loading spec...", seedName, data);
    var location = [seedsDir, seedName, 'seed.json'].join('/');
    util.getJSON(location, cb);
  };

  function prepareSpec(seed, cb) {
    seed.localNames = util.isArray(seed.local) ? seed.local : [seed.local];
    seed.remoteNames = util.isArray(seed.remote) ? seed.remote : [seed.remote];
    seed.hubName = seed.hub;
    seed.hub = {};
    seed.local = {};
    seed.remote = {};
    cb(null, seed);
  }

  util.async([loadSpec, prepareSpec], cb);
}

util.loadSeed = function (seedName, cb) {

  var seedsDir = './tests/seeds';

  var loadSeedSpec = function(data, cb) {
    util.loadSeedSpec(seedName, cb);
  }

  var loadRequiredSeeds = util.async.each({
    // before: function(seed) { console.log("Loading referenced seeds", seedName); },
    selector: function(seed) { return seed.requires; },
    iterator: function(seedName, seed, cb) {
      if (!seedName) return cb(null, seed);
      util.loadSeed(seedName, function(err, otherSeed) {
        if (err) return cb(err);
        seed.hub = util.update(seed.hub, otherSeed.hub);
        seed.local = util.update(seed.local, otherSeed.local);
        seed.remote = util.update(seed.remote, otherSeed.remote);
        cb(null, seed);
      });
    }
  });

  function loadHubSeed(seed, cb) {
    if (!seed.hubName) return cb(null, seed);
    var location = [seedsDir, seedName, seed.hubName].join('/');
    util.getJSON(location, function(err, hubSeed) {
      if (err) return cb(err);
      seed.hub = util.update(seed.hub, hubSeed);
      cb(null, seed);
    });
  }

  var loadLocalStoreSeeds = util.async.each({
    // before: function(seed) { console.log("Loading local store seeds for", seedName); },
    selector: function(seed) { return seed.localNames; },
    iterator: function(resourceName, seed, cb) {
      if (!resourceName) return cb(null, seed);
      var location = ['./tests/seeds', seedName, resourceName].join('/');
      util.getJSON(location, function(err, storeSeed) {
        if (err) return cb(err);
        seed.local = util.update(seed.local, storeSeed);
        cb(null, seed);
      });
    }
  });

  var loadRemoteStoreSeeds = util.async.each({
    // before: function(seed) { console.log("Loading remote store seeds for", seedName); },
    selector: function(seed) { return seed.remoteNames; },
    iterator: function(resourceName, seed, cb) {
      if (!resourceName) return cb(null, seed);
      var location = [seedsDir, seedName, resourceName].join('/');
      util.getJSON(location, function(err, storeSeed) {
        if (err) return cb(err);
        seed.remote = util.update(seed.remote, storeSeed);
        cb(null, seed);
      });
    }
  });

  util.async([loadSeedSpec, loadRequiredSeeds, loadHubSeed, loadLocalStoreSeeds, loadRemoteStoreSeeds], cb);
};
})(Substance.util);

if (typeof exports !== 'undefined') {
  module.exports = Substance.util;
} else {
  if (!window.Substance) window.Substance = {};
  window.Substance.util = Substance.util;
}