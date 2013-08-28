"use strict";

// A minimal fs facette to load data in browser being node.js/fs compatible.
var fs = {};

fs.readFile = function(dir, relPath, options, callback, context) {
  if (arguments.length === 3) {
    callback = options;
    options = undefined;
  }

  var path = dir + "/" + relPath;
  if (global.window === undefined) {
    var node_fs = require("fs");
    if (options.encoding) {
      node_fs.readFile(path, options.encoding, function(err, data) {
        callback.call(context, err, data);
      });
    } else {
      node_fs.readFile(path, function(err, data) {
        callback.call(context, err, data);
      });
    }
  } else {
    var convertedPath = [];
    var tmp = path.split("/");
    for (var i = 0; i < tmp.length; i++) {
      var s = tmp[i];
      if (i > 0 && s === "") {
        continue;
      } else if ( s !== "..") {
        convertedPath.push(s);
      } else {
        convertedPath.pop();
      }
    };
    convertedPath = convertedPath.join("/");

    $.get(convertedPath)
      .done(function(data) {
        callback.call(context, null, data);
      })
      .fail(function(err) {
        callback.call(context, err);
      });
  }
};

module.exports = fs;
