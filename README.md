# SystemJS Sass plugin

A [Sass](http://sass-lang.com/) loader plugin for
[SystemJS](https://github.com/systemjs/systemjs), based on
[sass.js](https://github.com/medialize/sass.js). This loaded is specially designed to 
work with angular2. Since angular2 can control the lifetime of an injected css, it shouldn't
be inserted into the DOM, it should only pass back the compiled css and this should be inserted
into an angular component


## Installation

```
$ jspm install scss=github:triarc/plugin-sass-content
```

## Usage

Add a dependency to a `.scss` file from within your JavaScript files,
followed by a `!` to trigger the use of this plugin:

``` ts
// for this to work in ts, you need tsc 1.9.*+ because you should have
// wildcard module declaration
declare module "scss!*" {
  let css: any;
  export default css;
}

import {css} from 'styles.scss!';
@Component({
  selector: 'demo-app',
  styles: [css]
})
```

