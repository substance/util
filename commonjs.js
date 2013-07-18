(function() {

  var esprima = require('esprima');
  var estraverse = require('estraverse');
  var escodegen = require('escodegen');
  var CJSEverywhere = require('./module');

  var REQUIRE = function(global) {
    var require = function(file, parentModule) {
      if({}.hasOwnProperty.call(require.cache, file)) {
        return require.cache[file];
      }
      var resolved = require.resolve(file);
      if(!resolved) {
        throw new Error('Failed to resolve module ' + file);
      }
      var module$ = {
        id: file,
        require: require,
        filename: file,
        exports: {},
        loaded: false,
        parent: parentModule,
        children: []
      };
      if(parentModule) {
        parentModule.children.push(module$);
      }
      var dirname = file.slice(0, file.lastIndexOf('/') + 1);
      require.cache[file] = module$.exports;
      resolved.call(global, module$.exports, module$, module$.exports, dirname, file);
      module$.loaded = true;
      require.cache[file] = module$.exports;

      return module$.exports;
    };
    require.modules = {};
    require.cache = {};
    require.resolve = function(file){
      return {}.hasOwnProperty.call(require.modules, file) ? require.modules[file] : void 0;
    };
    require.define = function(file, fn){
      require.modules[file] = fn;
    };
    global.require = require;
  };

  var MODULE = "require.define('${id}', function(global, module, exports, __dirname, __filename){${body}\n});";

  var Server = function(root, options) {
    this.root = root;
    this.options = options;
    this.cache = {};
    this.sources = {};
    this.map = {};
  };

  Server.__prototype__ = function() {

    function _prepareSource(source, nodes) {

      var lines = source.split(/\r?\n/);
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var loc = node.loc;

        if (loc.start.line !== loc.end.line) {
          throw new Error("require statement must be on a single line.");
        }

        var lineNumber = loc.start.line - 1;
        var str = lines[lineNumber];
        lines[lineNumber] = [
          str.substring(0, loc.start.column),
          escodegen.generate(node),
          str.substring(loc.end.column)
        ].join("");
      }

      return lines.join("\n");
    }

    function _minify(source) {
      var esmangle = require('esmangle');
      var ast = esprima.parse(source);
      esmangle.mangle(esmangle.optimize(ast), {
        destructive: true
      });
      return escodegen.generate(ast, {
        format: escodegen.FORMAT_MINIFY,
        renumber: true,
        hexadecimal: true,
        escapeless: true,
        compact: true,
        semicolons: false,
        parentheses: false
      });
    }

    function _updateEntry(self, path, entry) {

      var nodes = [];
      estraverse.traverse(entry.ast, {
        enter: function(node, parent) {
          if (node.type === 'CallExpression' && node.callee.name === 'require') {
            nodes.push(parent);
          }
          return true;
        }
      });

      if (nodes.length === 0) {
        return;
      }

      var id = entry.canonicalName;
      var body = _prepareSource(entry.fileContents, nodes);
      var code = MODULE.replace("${id}", id).replace("${body}", body);

      if (self.options.minify) {
        code = _minify(code);
      }

      self.sources[path] = code;
      self.map[id] = path;
    }

    this.update = function(entryPoint) {

      var entries = CJSEverywhere.traverseDependencies(entryPoint, this.root, {
        cache: this.cache
      });

      for (var path in entries) {
        var entry = entries[path];
        _updateEntry(this, path, entry);
      }

    };

    Server.prototype.list = function() {
      return Object.keys(this.map);
    };

    Server.prototype.getScript = function(resource) {
      if (this.map[resource] === undefined) {
        throw new Error("Unknown resource: " + resource);
      }

      if (resource === "/require.js") {
        return "("+REQUIRE.toString()+").call(this,this);";
      } else {
        var path = this.map[resource];
        this.update(path);
        return this.sources[path];
      }
    };
  };
  Server.prototype = new Server.__prototype__();

}).call(this);
