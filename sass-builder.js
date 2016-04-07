var autoprefixer =  require('autoprefixer');
var cloneDeep = require('lodash/cloneDeep');
var fs = require( 'fs');
var isEmpty = require( 'lodash/isEmpty');
var isUndefined = require( 'lodash/isUndefined');
var path = require( 'path');
var postcss = require( 'postcss');
var sass = require( 'sass.js');

var resolvePath = require( './resolve-path');

var cssInject = "(function(c){if (typeof document == 'undefined') return; var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})";
var isWin = process.platform.match(/^win/);

var escape = function(source) {
  return source
    .replace(/(["\\])/g, '\\$1')
    .replace(/[\f]/g, '\\f')
    .replace(/[\b]/g, '\\b')
    .replace(/[\n]/g, '\\n')
    .replace(/[\t]/g, '\\t')
    .replace(/[\r]/g, '\\r')
    .replace(/[\ufeff]/g, '')
    .replace(/[\u2028]/g, '\\u2028')
    .replace(/[\u2029]/g, '\\u2029');
};

var loadFile = function(file) {
  return new Promise(function(resolve, reject) {
    fs.readFile(file, { encoding: 'UTF-8' }, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

var fromFileURL = function(url) {
  var address = decodeURIComponent(url.replace(/^file:(\/+)?/i, ''));
  return !isWin ? `/${address}` : address.replace(/\//g, '\\');
};

// intercept file loading requests (@import directive) from libsass
sass.importer(function(request, done) {
  // Currently only supporting scss imports due to
  // https://github.com/sass/libsass/issues/1695
  var content;
  var resolved;
  var readImportPath;
  var readPartialPath;
  resolvePath(request)
    .then(function(importUrl) {
      resolved = importUrl;
      var partialUrl = importUrl.replace(/\/([^/]*)$/, '/_$1');
      readImportPath = fromFileURL(importUrl);
      readPartialPath = fromFileURL(partialUrl);
      return loadFile(readPartialPath);
    })
    .then(function(data) { return content = data})
    .catch(function() { return loadFile(readImportPath)})
    .then(function(data) {return content = data})
    .then(function() { return done({ content, path: resolved })})
    .catch(function() {return done()});
});

exports.default = function(loads, compileOpts) {
  var stubDefines = loads.map(function(load) {
    return `${(compileOpts.systemGlobal || 'System')}\.register('${load.name}', [], false, function() {});`;
  }).join('\n');

  var compilePromise = function(load) {
    return new Promise(function(resolve, reject) {
      var urlBase = `${path.dirname(load.address)}/`;
      var options = {};
      if (!isUndefined(System.sassPluginOptions) &&
          !isUndefined(System.sassPluginOptions.sassOptions)) {
        options = cloneDeep(System.sassPluginOptions.sassOptions);
      }
      options.style = sass.style.compressed;
      options.indentedSyntax = load.address.endsWith('.sass');
      options.importer = { urlBase };
      // Occurs on empty files
      if (isEmpty(load.source)) {
        return resolve('');
      }
      sass.compile(load.source, options, function(result) {
        if (result.status === 0) {
          if (!isUndefined(System.sassPluginOptions) &&
              System.sassPluginOptions.autoprefixer) {
            postcss([autoprefixer]).process(result.text).then(function(compilationResult) {
              resolve(compilationResult.css);
            });
          } else {
            resolve(result.text);
          }
        } else {
          reject(result.formatted);
        }
      });
    });
  };
  return new Promise(function(resolve, reject) {
    // Keep style order
    return Promise.all(loads.map(compilePromise))
    .then(
      function(response) {return  resolve([stubDefines, cssInject, `("${escape(response.reverse().join(''))}");`].join('\n')); },
      function(reason) { return reject(reason);});
  });
};