"use strict";

var _ = require("underscore");

// Helpers for working with the DOM

var dom = {};

dom.ChildNodeIterator = function(arg) {
  if(_.isArray(arg)) {
    this.nodes = arg;
  } else {
    this.nodes = arg.childNodes;
  }
  this.length = this.nodes.length;
  this.pos = -1;
};

dom.ChildNodeIterator.prototype = {
  hasNext: function() {
    return this.pos < this.length - 1;
  },

  next: function() {
    this.pos += 1;
    return this.nodes[this.pos];
  },

  back: function() {
    this.pos -= 1;
    return this;
  }
};

// Note: it is not safe regarding browser in-compatibilities
// to access el.children directly.
dom.getChildren = function(el) {
  if (el.children !== undefined) return el.children;
  var children = [];
  var child = el.firstElementChild;
  while (child) {
    children.push(child);
    child = child.nextElementSibling;
  }
  return children;
};

module.exports = dom;
