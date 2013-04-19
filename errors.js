(function() {

  if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    var util = require('./util')
  } else {
     var util = Substance.util;
  }

  var root = this;
  var errors = {};

  errors.define = function(className, code) {
    var errorClass = util.inherits(Error, {
      constructor: function(message) {
        Error.apply(this, arguments);
        this.message = message;
      },
      code: code,
      name: className,
      toJSON: function() {
        return {
          name: this.name,
          message: this.message,
          code: this.code
        };
      }
    }, {});

    if (typeof exports !== 'undefined') {
        module.exports[className] = errorClass;
    } else {
      errors[className] = errorClass;
    }

    return errorClass;
  }

  if (typeof exports === 'undefined') {
    if (!root.Substance) root.Substance = {};
    root.Substance.errors = errors;
    console.log("Added errors....");
  } else {
    module.exports = errors;
  }

}).call(this);
