
  var Sass = require('sass.js/dist/sass');
  var sass = new Sass();

  // Turn on source maps
  sass.options({
    // Embed included contents in maps
    sourceMapContents: true,
    // Embed sourceMappingUrl as data uri
    sourceMapEmbed: true,
    // Disable sourceMappingUrl in css output
    sourceMapOmitUrl: false
  });

  // Resolve @imports
  sass.importer(function(request, done) {
    // TODO: relative to importing sass file
    //       see https://github.com/medialize/sass.js#using-the-sassjs-api
    var url = request.current;
    fetchText(url).then(function(text) {
      done({path: url, content: text});
    }, function(error) {
      done({path: url, error: error.message});
    });
  });

  // setting format = 'defined' means we're managing our own output
  function translate(load) {
      
      return new Promise(function(resolve, reject) {
      sass.compile(load.source, {
        inputPath: load.address
      }, function(result) {
        var successful = result.status === 0;
        if (successful) {
           
          load.metadata.format = 'esm';
  
          resolve('export default ' + JSON.stringify(result.text) + ";");
        } else {
          reject(result.formatted);
        }
      });
    });
    
  }

  // dynamically load external sass-builder to avoid bundling
  // dependencies from being loaded with the plugin when in the
  // browser
  function bundle(loads, opts) {
    var loader = this;
    return loader.import('./sass-builder', { name: module.id }).then(function(builder) {
      return builder(loads, opts);
    });
  }

  exports.translate = translate;
  exports.bundle = bundle;

function fetchText(url) {
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        resolve(request.responseText);
      } else {
        reject(new Error('Request error for "' +url+ '" with status ' + request.status));
      }
    };

    request.onerror = function(e) {
      reject(e);
    };

    request.send();
  });
}
