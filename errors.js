(function(root) {

if (typeof exports !== 'undefined') {
  var _ = require('underscore');
  var util = require('./util')
} else {
   var util = Substance.util;
}

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

  this.stack = util.callstack(1);
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
    for (var idx = 0; idx < this.stack.length; idx++) {
      var s = this.stack[idx];
      console.log(s.file+":"+s.line+":"+s.col, "("+s.func+")");
    }
  };
};
errors.SubstanceError.prototype = new errors.SubstanceError.__prototype__();

errors.define = function(className, code) {
  errors[className] = errors.SubstanceError.bind(null, className, code);
  errors[className].prototype = errors.SubstanceError.prototype;

  return errors[className];
}

if (typeof exports === 'undefined') {
  if (!root.Substance) root.Substance = {};
  root.Substance.errors = errors;
} else {
  module.exports = errors;
}

})(this);
