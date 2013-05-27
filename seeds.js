(function(root) { "use_strict";

// Imports
// ====

var _, util;

if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('./util');
} else {
  _ = root._;
  util = root.Substance.util;
}

// Module
// ====

var seeds = {};
var SEEDS_DIR = "./tests/seeds";

seeds.prepareSeedSpec = function(seedSpec, cb) {
    var _seedSpec = {}

    _seedSpec.localFiles = _.isArray(seedSpec.local) ? seedSpec.local : ((seedSpec.local) ? [seedSpec.local] : []);
    _seedSpec.remoteFiles = _.isArray(seedSpec.remote) ? seedSpec.remote : ((seedSpec.remote) ? [seedSpec.remote] : []);
    _seedSpec.requires = _.isArray(seedSpec.requires) ? seedSpec.requires : ((seedSpec.requires) ? [seedSpec.requires] : []);
    _seedSpec.hubFile = seedSpec.hub;
    _seedSpec.hub = {};
    _seedSpec.local = {};
    _seedSpec.remote = {};
    _seedSpec.dir = seedSpec.dir;

    cb(null, _seedSpec);
}

seeds.loadSeedSpec = function (seedName, cb) {

  //console.log("Loading spec...", seedName, data);
  var location = [SEEDS_DIR, seedName, 'seed.json'].join('/');
  util.getJSON(location, function(err, seedSpec) {
    if (err) return cb(err);
    // storing the file info into the seed spec
    seedSpec.dir = [SEEDS_DIR, seedName].join('/');;
    seeds.prepareSeedSpec(seedSpec, cb);
  });
}

seeds.loadStoreSeed = function(seedFile, dir, cb) {
  if (arguments.length == 2) {
    cb = dir;
    dir = undefined;
  }

  var seedsDir = dir || SEEDS_DIR;
  var location = [seedsDir, seedFile].join('/');

  util.getJSON(location, cb);
}

seeds.loadSeed = function(seedSpec, cb) {

  var seedsDir = seedSpec.dir || SEEDS_DIR;

  var seed = {
    local: {},
    remote: {},
    hub: {}
  };

  // Seed specs can contain references to other seed specs in the `requires` field.
  // This function loads these seeds recursively
  var loadRequiredSeeds = util.async.iterator({
    selector: function() { return seedSpec.requires; },
    iterator: function(seedName, idx, seedSpec, cb) {
      if (!seedName) return cb(null, seedSpec);

      var spec;
      var otherSeed;

      function loadSeedSpec(cb) {
        console.log("Loading referenced seed", seedName);
        seeds.loadSeedSpec(seedName, function(err, data) {
          spec = data;
          cb(err);
        });
      }

      function load(cb) {
        seeds.loadSeed(spec, function(err, data) {
          console.log("... seed data:", data);
          otherSeed = data;
          cb(err);
        });
      }

      function store(cb) {
        _.extend(seed.hub, otherSeed.hub);
        _.extend(seed.local, otherSeed.local);
        _.extend(seed.remote, otherSeed.remote);
        cb(null);
      }

      util.async.sequential([loadSeedSpec, load, store], cb);
    }
  });

  function loadHubSeed(cb) {
    if (!seedSpec.hubFile) return cb(null);

    console.log("Loading hub seed", seedSpec.hubFile);
    seeds.loadStoreSeed(seedSpec.hubFile, seedsDir, function(err, hubSeed) {
      if (err) return cb(err);
      _.extend(seed.hub, hubSeed);
      cb(null);
    });
  }

  var loadLocalStoreSeeds = util.async.iterator({
    selector: function() { return seedSpec.localFiles; },
    iterator: function(resourceName, cb) {
      if (!resourceName) return cb(null);

      console.log("Loading local seed", resourceName);
      seeds.loadStoreSeed(resourceName, seedsDir, function(err, storeSeed) {
        if (err) return cb(err);
        _.extend(seed.local, storeSeed);
        cb(null);
      });
    }
  });

  var loadRemoteStoreSeeds = util.async.iterator({
    // before: function(seed) { console.log("Loading remote store seeds for", seedName); },
    selector: function() { return seedSpec.remoteFiles; },
    iterator: function(resourceName, cb) {
      if (!resourceName) return cb(null);

      console.log("Loading remote seed", resourceName);
      seeds.loadStoreSeed(resourceName, seedsDir, function(err, storeSeed) {
        if (err) return cb(err);
        _.extend(seed.remote, storeSeed);
        cb(null);
      });
    }
  });

  util.async.sequential([loadRequiredSeeds, loadHubSeed,
    loadLocalStoreSeeds, loadRemoteStoreSeeds], function(err) {
      if (err) return cb(err);
      cb(null, seed);
    });
};

seeds.loadSeedByName = function(seedName, cb) {
  seeds.loadSeedSpec(seedName, function(err, seedSpec) {
    if(err) return cb(err);
    seeds.loadSeed(seedSpec, cb);
  });
}

// Export
// ====

if (typeof exports === 'undefined') {
  root.Substance.seeds = seeds;
} else {
  module.exports = seeds;
}

})(this);
