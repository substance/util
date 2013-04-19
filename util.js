if (typeof Substance === 'undefined') Substance = {};
if (typeof Substance.util === 'undefined') Substance.util = {};

(function(util){

var env = (typeof exports === 'undefined') ? 'composer' : 'hub';

if (typeof exports !== 'undefined') {
  var fs = require('fs');
  var _ = (env == 'hub') ? require('underscore') : _;
}

// Async Control Flow for the Substance
// --------

util.isFunction = function(obj) {
  return ( Object.prototype.toString.call(obj) === '[object Function]');
};

util.isArray = function(obj) {
  return ( Object.prototype.toString.call(obj) === '[object Array]');
};

util.isString = function(obj) {
  return (Object.prototype.toString.call(obj) === '[object String]');
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
    function arrayFunction(item, index) {
      return function(data, cb) {
        if (iterator.length === 2) {
          iterator(item, cb);
        } else if (iterator.length === 3) {
          iterator(item, index, cb);
        } else {
          iterator(item, index, data, cb);
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
        funcs.push(arrayFunction(items[idx], idx));
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
//     var func = util.async.each(items, function(item, [idx, [data,]] cb) { ... });
//     var func = util.async.each(options)
//
// options:
//    items:    the items to be iterated
//    selector: used to select items dynamically from the data provided by the previous function in the chain
//    before:   an extra function called before iteration
//    iterator: the iterator function (item, [idx, [data,]] cb)
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

util.propagate = function(data, cb) {
  return function(err, ignoredData) {
    if (err) return cb(err);
    cb(null, data);
  }
}



// shamelessly stolen from backbone.js:
// Helper function to correctly set up the prototype chain, for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
var ctor = function(){};
util.inherits = function(parent, protoProps, staticProps) {
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ parent.apply(this, arguments); };
  }

  // Inherit class (static) properties from parent.
  _.extend(child, parent);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) _.extend(child.prototype, protoProps);

  // Add static properties to the constructor function, if supplied.
  if (staticProps) _.extend(child, staticProps);

  // Correctly set child's `prototype.constructor`.
  child.prototype.constructor = child;

  // Set a convenience property in case the parent's prototype is needed later.
  child.__super__ = parent.prototype;

  return child;
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

util.prepareSeedSpec = function(seed, cb) {

    seed.localFiles = util.isArray(seed.local) ? seed.local : [seed.local];
    seed.remoteFiles = util.isArray(seed.remote) ? seed.remote : [seed.remote];
    seed.requires = util.isArray(seed.requires) ? seed.requires : [seed.requires];
    seed.hubFile = seed.hub;
    seed.hub = {};
    seed.local = {};
    seed.remote = {};

    cb(null, seed);
}

util.loadSeedSpec = function(seedName, cb) {
  var seedsDir = './tests/seeds';

  //console.log("Loading spec...", seedName, data);
  var location = [seedsDir, seedName, 'seed.json'].join('/');
  util.getJSON(location, function(err, seedSpec) {
    if (err) return cb(err);
    // storing the file info into the seed spec
    seedSpec.dir = [seedsDir, seedName].join('/');;
    util.prepareSeedSpec(seedSpec, cb);
  });
}

util.loadSeed = function (seedSpec, cb) {

  var seedsDir = seedSpec.dir || './tests/seeds';

  var loadRequiredSeeds = util.async.each({
    // before: function(seed) { console.log("Loading referenced seeds", seedName); },
    selector: function(seed) { return seed.requires; },
    iterator: function(seedName, idx, seed, cb) {
      if (!seedName) return cb(null, seed);
//      console.log("Loading referenced seed", seedName);
      util.loadSeedSpec(seedName, function(err, seedSpec) {
//        console.log("Loaded referenced seed spec", seedSpec);
        if (err) return cb(err);
        util.loadSeed(seedSpec, function(err, otherSeed) {
          if (err) return cb(err);
          seed.hub = util.update(seed.hub, otherSeed.hub);
          seed.local = util.update(seed.local, otherSeed.local);
          seed.remote = util.update(seed.remote, otherSeed.remote);
          cb(null, seed);
        });
      });
    }
  });

  function loadHubSeed(seed, cb) {
    if (!seed.hubFile) return cb(null, seed);
    var location = [seedsDir, seed.hubFile].join('/');
    console.log("loading hub seed file from", location);
    util.getJSON(location, function(err, hubSeed) {
      if (err) return cb(err);
      seed.hub = util.update(seed.hub, hubSeed);
      cb(null, seed);
    });
  }

  var loadLocalStoreSeeds = util.async.each({
    // before: function(seed) { console.log("Loading local store seeds for", seedName); },
    selector: function(seed) { return seed.localFiles; },
    iterator: function(resourceName, idx, seed, cb) {
      if (!resourceName) return cb(null, seed);
      var location = [seedsDir, resourceName].join('/');
//      console.log("loading local store seed file from", location);

      util.getJSON(location, function(err, storeSeed) {
        if (err) return cb(err);
        seed.local = util.update(seed.local, storeSeed);
        cb(null, seed);
      });
    }
  });

  var loadRemoteStoreSeeds = util.async.each({
    // before: function(seed) { console.log("Loading remote store seeds for", seedName); },
    selector: function(seed) { return seed.remoteFiles; },
    iterator: function(resourceName, idx, seed, cb) {
      if (!resourceName) return cb(null, seed);
      var location = [seedsDir, resourceName].join('/');
//      console.log("loading remote store seed file from", location);

      util.getJSON(location, function(err, storeSeed) {
        if (err) return cb(err);
        seed.remote = util.update(seed.remote, storeSeed);
        cb(null, seed);
      });
    }
  });

  util.async([loadRequiredSeeds, loadHubSeed, loadLocalStoreSeeds, loadRemoteStoreSeeds], seedSpec, cb);
};
})(Substance.util);

if (typeof exports !== 'undefined') {
  module.exports = Substance.util;
} else {
  if (!window.Substance) window.Substance = {};
  window.Substance.util = Substance.util;
}