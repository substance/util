"use strict";

var _ = require("underscore");
var async = require("./async");

var JSZip;

if (typeof window === "undefined" || window.nw) {
  JSZip = require("jszip");
} else {
  JSZip = window.JSZip;
}


// Utility for working with Substance Zip files
// ------------
//

var ziputil = {};

// Extract a document from raw data
// --------
//
// Document gets stored as a zip archive
// TODO: needs some love

ziputil.unzip = function(zip, documentFactory) {

  var rawDoc = zip.files["content.json"].asText();

  if (rawDoc) {
    var jsonDoc = JSON.parse(rawDoc);
    var doc = documentFactory.createFromJSON(jsonDoc);

    // Extract files
    var fileIndex = doc.getIndex("files");

    _.each(fileIndex.nodes, function(fileId) {
      var file = doc.get(fileId);

      if (file.isText()) {
        file.updateData(zip.files[file.id].asText());
      } else {
        file.updateData(zip.files[file.id].asArrayBuffer());
      }
    }, this);

    return doc;
  }
  return null;
};

ziputil.unzipFromBase64 = function(data, documentFactory) {
  var zip = new JSZip(data, {base64: true});
  return ziputil.unzip(zip, documentFactory);
};

ziputil.unzipFromArrayBuffer = function(data, documentFactory) {
  var zip = new JSZip(data);
  return ziputil.unzip(zip, documentFactory);
};

// Generates file based on the current doc in memory
// --------
//
// Document gets stored as a zip archive
// TODO: needs some love
// 
// TODO: now that we have arrayBuffer as our internal format
// we can get rid of the FileReader nastyness

ziputil.zip = function(doc, cb) {

  var FileReader = window.FileReader;

  // Helper to read a binary string from a blog
  // that uses the native FileReader API

  function readBinaryStringFromBlob(blob, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      cb(null, e.target.result);
    };

    reader.onerror = function (e) {
      cb(e.target.error);
    };

    reader.readAsBinaryString(blob);
  }

  var zip = new JSZip();
  var jsonDoc = doc.toJSON();

  // Prepare the tasks
  // we need to convert some blobs
  var tasks = [];
  var binaryStrings = {};


  var fileIndex = doc.getIndex("files");
  var files = {};

  _.each(fileIndex.nodes, function(fileId) {
    files[fileId] = doc.get(fileId);
  });

  // Extract binaryStrings from blob data
  // ----------
  //
  // Unfortunately this needs to happen asynchronously

  _.each(files, function(file, fileName) {
    if (file.isBinary()) {
      tasks.push(function(cb) {
        readBinaryStringFromBlob(file.getBlob(), function(err, bString) {
          binaryStrings[fileName] = bString;
          cb(null);
        });
      });
    }
  });

  async.sequential({
    functions: tasks,
  }, function(err) {
    if (err) {
      // util.printStackTrace(err);
      console.error(err);
      return cb(err);
    }

    _.each(files, function(file, fileName) {
      if (file.isJSON()) {
        zip.file(fileName, JSON.stringify(file.getData(), null, '  '));
      } else if (file.isText()) {
        zip.file(fileName, file.getData());
      } else {
        zip.file(fileName, binaryStrings[fileName], {binary: true});
      }
    });

    zip.file("content.json", JSON.stringify(jsonDoc, null, "  "));

    cb(null, zip);
  });
};

module.exports = ziputil;