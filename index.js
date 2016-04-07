var fetch;
var translate;
var bundle;

if (typeof window !== 'undefined') {
  fetch = function(load) {
    return System.import(__dirname + '/sass-inject')
      .then(function(inject){ return inject.default(load)});
  };
} else {
  // setting format = 'defined' means we're managing our own output
  translate = function(load) {
    load.metadata.format = 'defined';
  };
  bundle = function bundler(loads, opts) {
    return System.import(__dirname + '/sass-builder')
      .then(function(builder){ return builder.default.call(System, loads, opts)});
  };
}

exports.fetch = fetch;
exports.translate = translate;
exports.bundle = bundle;