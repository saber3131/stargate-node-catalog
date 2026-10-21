'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// This minimal DOM verifies our own page script without a browser or any network API.
// It is not a browser rendering, CSP enforcement or visual accessibility test.
function loadDemo() {
  class Element {
    constructor(tag = 'div') { this.tag = tag; this.children = []; this.value = ''; this.listeners = {}; this.textContent = ''; this.hidden = false; }
    append(...elements) {
      for (const element of elements) this.children.push(...(element.tag === 'fragment' ? element.children : [element]));
    }
    replaceChildren(...elements) { this.children = []; this.append(...elements); }
    addEventListener(event, callback) { this.listeners[event] = callback; }
    fire(event) { this.listeners[event](); }
    focus() { this.focused = true; }
    set innerHTML(_) { throw new Error('HTML injection is forbidden in this demo'); }
  }
  const elements = Object.fromEntries(['search', 'region', 'protocol', 'sort', 'direction', 'rows', 'summary', 'empty', 'reset'].map(id => [id, new Element()]));
  elements.sort.value = 'name';
  elements.direction.value = 'asc';
  const context = vm.createContext({ document: {
    getElementById(id) { assert.ok(elements[id]); return elements[id]; },
    createElement(tag) { return new Element(tag); },
    createDocumentFragment() { return new Element('fragment'); }
  } });
  for (const file of ['src/catalog.js', 'examples/synthetic-nodes.js', 'demo/app.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file, timeout: 1000 });
  }
  const names = () => elements.rows.children.map(row => row.children[0].children[0].textContent);
  const set = (id, value) => { elements[id].value = value; elements[id].fire('input'); };
  return { elements, names, set };
}

test('browser script branch loads shared module and renders all six invented nodes', () => {
  const { elements, names } = loadDemo();
  assert.deepEqual(names(), ['Atlas Demo', 'Aurora Demo', 'Lyra Demo', 'Nova Demo', 'Orion Demo', 'Vega Demo']);
  assert.equal(elements.summary.textContent, '6 of 6 synthetic nodes');
  assert.equal(elements.empty.hidden, true);
});

test('actual demo event handlers combine filters, sort, show empty state and reset', () => {
  const { elements, names, set } = loadDemo();
  set('region', 'EU');
  set('sort', 'latency');
  assert.deepEqual(names(), ['Vega Demo', 'Aurora Demo']);
  set('direction', 'desc');
  assert.deepEqual(names(), ['Aurora Demo', 'Vega Demo']);
  set('protocol', 'wireguard');
  assert.deepEqual(names(), ['Vega Demo']);
  set('search', 'ORION');
  assert.deepEqual(names(), []);
  assert.equal(elements.empty.hidden, false);
  elements.reset.fire('click');
  assert.equal(names().length, 6);
  assert.equal(elements.search.focused, true);
  assert.equal(elements.summary.textContent, '6 of 6 synthetic nodes');
});

test('demo invalid input shows fixed text and never reflects arbitrary strings', () => {
  const { elements, set, names } = loadDemo();
  set('search', '<invented-private-marker>');
  assert.deepEqual(names(), []);
  assert.equal(elements.summary.textContent, 'Search accepts letters, numbers, spaces and hyphens only.');
  assert.equal(elements.summary.textContent.includes('invented-private-marker'), false);
  assert.equal(elements.empty.hidden, true);
  set('search', 'orion');
  assert.deepEqual(names(), ['Orion Demo']);
});
