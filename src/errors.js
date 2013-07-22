"use strict";

// Imports
// ====

var _ = require('underscore');
var util = require('./util');

// Module
// ====

var errors = {};

errors.SubstanceError = function(name, code, message) {
  if (arguments.length == 1) {
    message = name;
    name = "SubstanceError";
    code = -1;
  }

  this.message = message;
  this.name = name;
  this.code = code;

  this.__stack = util.callstack(1);
};

errors.SubstanceError.__prototype__ = function() {

  this.toString = function() {
    return this.name+":"+this.message;
  };

  this.toJSON = function() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      stack: this.stack
    };
  };

  this.printStackTrace = function() {
    util.printStackTrace(this);
  };

};
errors.SubstanceError.prototype = new errors.SubstanceError.__prototype__();

Object.defineProperty(errors.SubstanceError.prototype, "stack", {
  get: function() {
    var str = [];
    for (var idx = 0; idx < this.__stack.length; idx++) {
      var s = this.__stack[idx];
      str.push(s.file+":"+s.line+":"+s.col+" ("+s.func+")");
    }
    return str.join("\n");
  },
  set: function() { throw new Error("immutable.")}
});

errors.define = function(className, code) {
  errors[className] = errors.SubstanceError.bind(null, className, code);
  errors[className].prototype = errors.SubstanceError.prototype;
  return errors[className];
};

module.exports = errors;
