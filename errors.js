(function(root) {

if (typeof exports !== 'undefined') {
  var _ = require('underscore');
  var util = require('./util')
} else {
   var util = Substance.util;
}

var errors = {};

SubstanceError = function(name, code, message) {
  if (arguments.length == 1) {
    message = name;
    name = "SubstanceError";
    code = -1;
  }

  this.message = message;
  this.name = name;
  this.code = code;

  this.stack = util.callstack(1);
};

SubstanceError.prototype = {
  toString: function() {
    return this.name+":"+this.message;
  },
  toJSON: function() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      stack: this.stack
    };
  },
  printStackTrace: function() {
    for (var idx = 0; idx < this.stack.length; idx++) {
      var s = this.stack[idx];
      console.log(s.file+":"+s.line+":"+s.col, "("+s.func+")");
    }
  }
}

errors.define = function(className, code) {
  errors[className] = SubstanceError.bind(null, className, code);
  errors[className].prototype = SubstanceError.prototype;

  return errors[className];
}

if (typeof exports === 'undefined') {
  if (!root.Substance) root.Substance = {};
  root.Substance.errors = errors;
} else {
  module.exports = errors;
}

})(this);
