(function() {

  if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    var util = require('./util')
  } else {
     var util = Substance.util;
  }

  var root = this;
  var errors = {};

  errors.defineError = function(className, code, parent) {
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

    if (exports) {
      module.exports[className] = errorClass;
    } else {
      root.errors[className] = errorClass;
    }

    return errorClass;
  }

  if (typeof exports === 'undefined') {
    if (root.Substance === undefined) root.Substance = {};
    _.extend(root.Substance, errors);
  } else {
    module.exports = errors;
  }

}).call(this);
