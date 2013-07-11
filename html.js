(function(root) { "use strict";

  var Substance = root.Substance;

  var html = {};

  html.compileTemplate = function(tplName) {
    var rawTemplate = $('script[name='+tplName+']').html();
    Substance.templates[tplName] = Handlebars.compile(rawTemplate);
  };

  html.renderTemplate = function(tplName, data) {
    return Substance.templates[tplName](data);
  };

  // Exports
  // ====

  if (typeof exports !== 'undefined') {
    module.exports = html;
  } else {
    if (!root.Substance.util) root.Substance.util = {};
    root.Substance.util.html = html;
  }

})(this);