"use strict";

var html = {};
var Handlebars = require("handlebars");

html.templates = {};

html.compileTemplate = function(tplName) {
  var rawTemplate = $('script[name='+tplName+']').html();
  html.templates[tplName] = Handlebars.compile(rawTemplate);
};

html.renderTemplate = function(tplName, data) {
  return html.templates[tplName](data);
};

Handlebars.registerHelper('ifelse', function(cond, textIf, textElse) {
  textIf = Handlebars.Utils.escapeExpression(textIf);
  textElse  = Handlebars.Utils.escapeExpression(textElse);
  return new Handlebars.SafeString(cond ? textIf : textElse);
});

// Exports
// ====

module.exports = html;
