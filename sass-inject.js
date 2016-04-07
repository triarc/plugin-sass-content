/* global Modernizr __moduleName */

require('./modernizr');

var autoprefixer = require( 'autoprefixer');
var isEmpty = require( 'lodash/isEmpty');
var isString = require( 'lodash/isString');
var isUndefined = require( 'lodash/isUndefined');
var path = require( 'path');
var postcss = require( 'postcss');
var reqwest = require( 'reqwest');
var url = require( 'url');

var resolvePath = require( './resolve-path');

var importSass = new Promise(function(resolve, reject) {
  if (false){//if (Modernizr.webworkers) {
    System.import('sass.js/dist/sass').then(function(Sass) {
      System.normalize('/sass.js/dist/sass.worker').then(function(worker) {
        resolve(new Sass(worker));
      });
    }).catch(function(err) {return reject(err);});
  } else {
    System.import('sass.js/dist/sass.sync').then(function(Sass) {
      resolve(Sass);
    }).catch(function(err) {return reject(err);});
  }
});

var sassImporter = function(request, done) {
  var resolved;
  var content;
  // Currently only supporting scss imports due to
  // https://github.com/sass/libsass/issues/1695
  resolvePath.default(request).then(function(resolvedUrl) {
    resolved = resolvedUrl;
    var partialPath = resolved.replace(/\/([^/]*)$/, '/$1');
    return reqwest(partialPath);
  })
    .then(function(resp) {
      // In Cordova Apps the response is the raw XMLHttpRequest
      content = resp.responseText ? resp.responseText : resp;
      return content;
    })
    .catch(function(){return reqwest(resolved)})
    .then(function(resp) {
      content = resp.responseText ? resp.responseText : resp;
      return content;
    })
    .then(function() { return done({ content, path: resolved });})
    .catch(function() {return done()});
};

// intercept file loading requests (@import directive) = require( libsass
importSass.then(function(sass) {
  sass.importer(sassImporter);
});

var compile = function(scss) {
  return new Promise(function(resolve, reject) {
    var content = scss.content;
    var responseText = content.responseText;
    if (isString(content) && isEmpty(content) ||
        !isUndefined(responseText) && isEmpty(responseText)) {
      return resolve('');
    }
    importSass.then(function(sass) {
      function inject(css) {
           //load.metadata.format = 'esm';
           resolve('export default ' + JSON.stringify(css) + ";");
      }
      sass.compile(content, scss.options, function(result)  {
        if (result.status === 0) {
          if (!isUndefined(System.sassPluginOptions) &&
              System.sassPluginOptions.autoprefixer) {
            postcss([autoprefixer]).process(result.text).then(function(cssResponse) {
              inject(cssResponse.css);
            });
          } else {
            inject(result.text);
          }
        } else {
          reject(result.formatted);
        }
      });
    });
  });
};

exports.default =function(load) {
  var basePath = path.dirname(url.parse(load.address).pathname);
  if (basePath !== '/') {
    basePath += '/';
  }
  var urlBase = basePath;
  var indentedSyntax = load.address.endsWith('.sass');
  var options = {};
  if (!isUndefined(System.sassPluginOptions) &&
      !isUndefined(System.sassPluginOptions.sassOptions)) {
    options = System.sassPluginOptions.sassOptions;
  }
  options.indentedSyntax = indentedSyntax;
  options.importer = { urlBase };
  // load initial scss file
  return reqwest(load.address)
    // In Cordova Apps the response is the raw XMLHttpRequest
    .then(function(resp) {
      return {
        content: resp.responseText ? resp.responseText : resp,
        options,
      };
    })
    .then(compile);
};