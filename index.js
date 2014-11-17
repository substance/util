"use strict";

var util = require("./src/util");

util.async = require("./src/async");
util.errors = require("./src/errors");
util.html = require("./src/html");
util.dom = require("./src/dom");
util.RegExp = require("./src/regexp");
util.Fragmenter = require("./src/fragmenter");

module.exports = util;
