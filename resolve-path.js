var path = require('path');
var  url = require('url');

var paths = {};

var resolvePath = function(request) {
  return new Promise(function(resolve, reject) {
    var { previous } = request;
    var { current } = request;
    if (current.substr(0, 5) === 'jspm:') {
      current = current.replace(/^jspm:/, '') + '.scss';
      System.normalize(current)
        .then(function(file) { return resolve(file.replace(/\.js$|\.ts$/, ''));})
        .catch(function(e) {return reject(e)});
    } else {
      var prevBase = path.dirname(previous);
      if (prevBase.legth === 0){
          prevBase += '/';
      }
      var base = (previous === 'stdin') ? request.options.urlBase : paths[previous] || prevBase;
      var resolved = url.resolve(base, current);
      if (previous !== 'stdin') paths[current] = path.dirname(resolved) + '/';
      resolve(`${resolved}.scss`);
    }
  });
};

exports.default = resolvePath;