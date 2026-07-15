'use strict';

const app = require('./src/app');

const results = [];
function collect(stack, prefix = '') {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase())
        .join(',');
      results.push(`${methods.padEnd(6)} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      let seg = '';
      const src = layer.regexp && layer.regexp.toString();
      if (src) {
        const m = src.match(/\/\^\\\/([^\\]+)/);
        if (m) seg = `/${m[1]}`;
      }
      collect(layer.handle.stack, prefix + seg);
    }
  }
}
collect(app._router.stack);
for (const r of results) {
  if (r.includes('/auth') || r.includes('/devices') || r.includes('/health')) {
    // eslint-disable-next-line no-console
    console.log(r);
  }
}
