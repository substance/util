"use strict";

// Imports
// ====

var _ = require('underscore');

// Module
// ====

var util = {};

// UUID Generator
// -----------------

/*!
Math.uuid.js (v1.4)
http://www.broofa.com
mailto:robert@broofa.com

Copyright (c) 2010 Robert Kieffer
Dual licensed under the MIT and GPL licenses.
*/

util.uuid = function (prefix, len) {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split(''),
      uuid = [],
      radix = 16,
      idx;
  len = len || 32;

  if (len) {
    // Compact form
    for (idx = 0; idx < len; idx++) uuid[idx] = chars[0 | Math.random()*radix];
  } else {
    // rfc4122, version 4 form
    var r;

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';

    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (idx = 0; idx < 36; idx++) {
      if (!uuid[idx]) {
        r = 0 | Math.random()*16;
        uuid[idx] = chars[(idx == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
  }
  return (prefix ? prefix : "") + uuid.join('');
};

// creates a uuid function that generates counting uuids
util.uuidGen = function(defaultPrefix) {
  var id = 1;
  defaultPrefix = (defaultPrefix !== undefined) ? defaultPrefix : "uuid_";
  return function(prefix) {
    prefix = prefix || defaultPrefix;
    return prefix+(id++);
  };
};


// Events
// ---------------

// Taken from Backbone.js
//
// A module that can be mixed in to *any object* in order to provide it with
// custom events. You may bind with `on` or remove with `off` callback
// functions to an event; `trigger`-ing an event fires all callbacks in
// succession.
//
//     var object = {};
//     _.extend(object, util.Events);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
//

// A difficult-to-believe, but optimized internal dispatch function for
// triggering events. Tries to keep the usual cases speedy (most internal
// Backbone events have 3 arguments).
var triggerEvents = function(events, args) {
  var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
  switch (args.length) {
    case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
    case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
    case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
    case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
    default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
  }
};

// Regular expression used to split event strings.
var eventSplitter = /\s+/;

// Implement fancy features of the Events API such as multiple event
// names `"change blur"` and jQuery-style event maps `{change: action}`
// in terms of the existing API.
var eventsApi = function(obj, action, name, rest) {
  if (!name) return true;

  // Handle event maps.
  if (typeof name === 'object') {
    for (var key in name) {
      obj[action].apply(obj, [key, name[key]].concat(rest));
    }
    return false;
  }

  // Handle space separated event names.
  if (eventSplitter.test(name)) {
    var names = name.split(eventSplitter);
    for (var i = 0, l = names.length; i < l; i++) {
      obj[action].apply(obj, [names[i]].concat(rest));
    }
    return false;
  }

  return true;
};

util.Events = {

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  on: function(name, callback, context) {
    if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
    this._events =  this._events || {};
    var events = this._events[name] || (this._events[name] = []);
    events.push({callback: callback, context: context, ctx: context || this});
    return this;
  },

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, it will be removed.
  once: function(name, callback, context) {
    if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
    var self = this;
    var once = _.once(function() {
      self.off(name, once);
      callback.apply(this, arguments);
    });
    once._callback = callback;
    return this.on(name, once, context);
  },

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  off: function(name, callback, context) {
    var retain, ev, events, names, i, l, j, k;
    if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
    if (!name && !callback && !context) {
      this._events = {};
      return this;
    }

    names = name ? [name] : _.keys(this._events);
    for (i = 0, l = names.length; i < l; i++) {
      name = names[i];
      events = this._events[name];
      if (events) {
        this._events[name] = retain = [];
        if (callback || context) {
          for (j = 0, k = events.length; j < k; j++) {
            ev = events[j];
            if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                (context && context !== ev.context)) {
              retain.push(ev);
            }
          }
        }
        if (!retain.length) delete this._events[name];
      }
    }

    return this;
  },

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  trigger: function(name) {
    if (!this._events) return this;
    var args = Array.prototype.slice.call(arguments, 1);
    if (!eventsApi(this, 'trigger', name, args)) return this;
    var events = this._events[name];
    var allEvents = this._events.all;
    if (events) triggerEvents(events, args);
    if (allEvents) triggerEvents(allEvents, arguments);
    return this;
  },

  triggerLater: function() {
    var self = this;
    var _arguments = arguments;
    setTimeout(function() {
      self.trigger.apply(self, _arguments);
    }, 0);
  },

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  stopListening: function(obj, name, callback) {
    var listeners = this._listeners;
    if (!listeners) return this;
    var deleteListener = !name && !callback;
    if (typeof name === 'object') callback = this;
    if (obj) (listeners = {})[obj._listenerId] = obj;
    for (var id in listeners) {
      listeners[id].off(name, callback, this);
      if (deleteListener) delete this._listeners[id];
    }
    return this;
  }

};

var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

// Inversion-of-control versions of `on` and `once`. Tell *this* object to
// listen to an event in another object ... keeping track of what it's
// listening to.
_.each(listenMethods, function(implementation, method) {
  util.Events[method] = function(obj, name, callback) {
    var listeners = this._listeners || (this._listeners = {});
    var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
    listeners[id] = obj;
    if (typeof name === 'object') callback = this;
    obj[implementation](name, callback, this);
    return this;
  };
});

// Aliases for backwards compatibility.
util.Events.bind   = util.Events.on;
util.Events.unbind = util.Events.off;

util.Events.Listener = {

  listenTo: function(obj, name, callback) {
    if (!_.isFunction(callback)) {
      throw new Error("Illegal argument: expecting function as callback, was: " + callback);
    }

    // initialize container for keeping handlers to unbind later
    this._handlers = this._handlers || [];

    obj.on(name, callback, this);

    this._handlers.push({
      unbind: function() {
        obj.off(name, callback);
      }
    });

    return this;
  },

  stopListening: function() {
    if (this._handlers) {
      for (var i = 0; i < this._handlers.length; i++) {
        this._handlers[i].unbind();
      }      
    }
  }

};


var __once__ = _.once;

function callAsynchronousChain(options, cb) {
  var _finally = options.finally || function(err, data) { cb(err, data); };
  _finally = __once__(_finally);
  var data = options.data || {};
  var functions = options.functions;

  if (!_.isFunction(cb)) {
    return cb("Illegal arguments: a callback function must be provided");
  }

  var index = 0;
  var stopOnError = (options.stopOnError===undefined) ? true : options.stopOnError;
  var errors = [];

  function process(data) {
    var func = functions[index];

    // stop if no function is left
    if (!func) {
      if (errors.length > 0) {
        return _finally(new Error("Multiple errors occurred.", data));
      } else {
        return _finally(null, data);
      }
    }

    // A function that is used as call back for each function
    // which does the progression in the chain via recursion.
    // On errors the given callback will be called and recursion is stopped.
    var recursiveCallback = __once__(function(err, data) {
      // stop on error
      if (err) {
        if (stopOnError) {
          return _finally(err, null);
        } else {
          errors.push(err);
        }
      }

      index += 1;
      process(data);
    });

    // catch exceptions and propagat
    try {
      if (func.length === 1) {
        func(recursiveCallback);
      } else {
        func(data, recursiveCallback);
      }
    } catch (err) {
      console.log("util.async caught error:", err);
      util.printStackTrace(err);
      _finally(err);
    }
  }

  // start processing
  process(data);
}

// Async Control Flow for the Substance
// --------

// TODO: use util.async.sequential instead
util.async = {};

// Calls a given list of asynchronous functions sequentially
// -------------------
// options:
//    functions:  an array of functions of the form f(data,cb)
//    data:       data provided to the first function; optional
//    finally:    a function that will always be called at the end, also on errors; optional

util.async.sequential = function(options, cb) {
  // allow to call this with an array of functions instead of options
  if(_.isArray(options)) {
    options = { functions: options };
  }
  callAsynchronousChain(options, cb);
};

function asynchronousIterator(options) {
  return function(data, cb) {
    // retrieve items via selector if a selector function is given
    var items = options.selector ? options.selector(data) : options.items;
    var _finally = options.finally || function(err, data) { cb(err, data); };

    // don't do nothing if no items are given
    if (!items) return _finally(null, data);

    var isArray = _.isArray(items);

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
    var chainOptions = {
      functions: funcs,
      data: data,
      finally: _finally,
      stopOnError: options.stopOnError
    };
    callAsynchronousChain(chainOptions, cb);
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

// TODO: support only one version and add another function
util.async.iterator = function(options_or_items, iterator) {
  var options;
  if (arguments.length == 1) {
    options = options_or_items;
  } else {
    options = {
      items: options_or_items,
      iterator: iterator
    };
  }
  return asynchronousIterator(options);
};

util.async.each = function(options, cb) {
  // create the iterator and call instantly
  var f = asynchronousIterator(options);
  f(null, cb);
};

util.propagate = function(data, cb) {
  if(!_.isFunction(cb)) {
    throw "Illegal argument: provided callback is not a function";
  }
  return function(err) {
    if (err) return cb(err);
    cb(null, data);
  };
};

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
  if (typeof exports !== 'undefined') {
    var fs = require('fs');
    var obj = JSON.parse(fs.readFileSync(resource, 'utf8'));
    cb(null, obj);
  } else {
    //console.log("util.getJSON", resource);
    $.getJSON(resource)
      .done(function(obj) { cb(null, obj); })
      .error(function(err) { cb(err, null); });
  }
};

util.prototype = function(that) {
  /*jshint proto: true*/ // supressing a warning about using deprecated __proto__.
  return Object.getPrototypeOf ? Object.getPrototypeOf(that) : that.__proto__;
};

util.inherit = function(Super, Self) {
  var super_proto = _.isFunction(Super) ? new Super() : Super;
  var proto;
  if (_.isFunction(Self)) {
    Self.prototype = super_proto;
    proto = new Self();
  } else {
    var TmpClass = function(){};
    TmpClass.prototype = super_proto;
    proto = _.extend(new TmpClass(), Self);
  }
  return proto;
};

util.pimpl = function(pimpl) {
  var Pimpl = function(self) {
    this.self = self;
  };
  Pimpl.prototype = pimpl;
  return function(self) { self = self || this; return new Pimpl(self); };
};

util.parseStackTrace = function(err) {
  var SAFARI_STACK_ELEM = /([^@]*)@(.*):(\d+)/;
  var CHROME_STACK_ELEM = /\s*at ([^(]*)[(](.*):(\d+):(\d+)[)]/;

  var idx;
  var stackTrace = err.stack.split('\n');

  // parse the stack trace: each line is a tuple (function, file, lineNumber)
  // Note: unfortunately this is interpreter specific
  // safari: "<function>@<file>:<lineNumber>"
  // chrome: "at <function>(<file>:<line>:<col>"

  var stack = [];
  for (idx = 0; idx < stackTrace.length; idx++) {
    var match = SAFARI_STACK_ELEM.exec(stackTrace[idx]);
    if (!match) match = CHROME_STACK_ELEM.exec(stackTrace[idx]);
    if (match) {
      var entry = {
        func: match[1],
        file: match[2],
        line: match[3],
        col: match[4] || 0
      };
      if (entry.func === "") entry.func = "<anonymous>";
      stack.push(entry);
    }
  }

  return stack;
};

util.callstack = function(k) {
  var err;
  try { throw new Error(); } catch (_err) { err = _err; }
  var stack = util.parseStackTrace(err);
  k = k || 0;
  return stack.splice(k+1);
};

util.stacktrace = function (err) {
  var stack = (arguments.length === 0) ? util.callstack().splice(1) : util.parseStackTrace(err);
  var str = [];
  _.each(stack, function(s) {
    str.push(s.file+":"+s.line+":"+s.col+" ("+s.func+")");
  });
  return str.join("\n");
};

util.printStackTrace = function(err, N) {
  if (!err.stack) return;

  var stack;

  // Substance errors have a nice stack already
  if (err.__stack !== undefined) {
    stack = err.__stack;
  }
  // built-in errors have the stack trace as one string
  else if (_.isString(err.stack)) {
    stack = util.parseStackTrace(err);
  }
  else return;

  N = N || stack.length;
  N = Math.min(N, stack.length);

  for (var idx = 0; idx < N; idx++) {
    var s = stack[idx];
    console.log(s.file+":"+s.line+":"+s.col, "("+s.func+")");
  }
};

// computes the difference of obj1 to obj2
util.diff = function(obj1, obj2) {
  var diff;
  if (_.isArray(obj1) && _.isArray(obj2)) {
    diff = _.difference(obj2, obj1);
    // return null in case of equality
    if (diff.length === 0) return null;
    else return diff;
  }
  if (_.isObject(obj1) && _.isObject(obj2)) {
    diff = {};
    _.each(Object.keys(obj2), function(key) {
      var d = util.diff(obj1[key], obj2[key]);
      if (d) diff[key] = d;
    });
    // return null in case of equality
    if (_.isEmpty(diff)) return null;
    else return diff;
  }
  if(obj1 !== obj2) return obj2;
};

// Deep-Clone a given object
// --------
// Note: this is currently done via JSON.parse(JSON.stringify(obj))
//       which is in fact not optimal, as it depends on `toJSON` implementation.
util.deepclone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

// Clones a given object
// --------
// Calls obj's `clone` function if available,
// otherwise clones the obj using `util.deepclone()`.
util.clone = function(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (_.isFunction(obj.clone)) {
    return obj.clone();
  }
  return util.deepclone(obj);
};

util.freeze = function(obj) {
  var idx;
  if (_.isObject(obj)) {
    if (Object.isFrozen(obj)) return obj;

    var keys = Object.keys(obj);
    for (idx = 0; idx < keys.length; idx++) {
      var key = keys[idx];
      obj[key] = util.freeze(obj[key]);
    }
    return Object.freeze(obj);
  } else if (_.isArray(obj)) {
    var arr = obj;
    for (idx = 0; idx < arr.length; idx++) {
      arr[idx] = util.freeze(arr[idx]);
    }
    return Object.freeze(arr);
  } else {
    return obj; // Object.freeze(obj);
  }
};

util.later = function(f, context) {
  return function() {
    var _args = arguments;
    setTimeout(function() {
      f.apply(context, _args);
    }, 0);
  };
};


// Returns true if a string doesn't contain any real content

util.isEmpty = function(str) {
  return !str.match(/\w/);
};

// Export
// ====

module.exports = util;
