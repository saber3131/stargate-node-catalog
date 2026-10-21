'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCatalog, selectNodes, CatalogValidationError } = require('../src/catalog.js');
const fixture = require('../examples/synthetic-nodes.js');
const node = overrides => ({ ...fixture[0], tags: [...fixture[0].tags], ...overrides });
const ids = rows => rows.map(row => row.id);
const invalid = overrides => assert.equal(validateCatalog([node(overrides)]).valid, false);

test('bundled synthetic fixture and empty catalog validate', () => {
  assert.deepEqual(validateCatalog(fixture), { valid: true, errors: [] });
  assert.deepEqual(selectNodes([]), []);
});

test('combined filters and pagination produce exact expected rows', () => {
  assert.deepEqual(ids(selectNodes(fixture, { region: 'EU', tags: ['demo'], sortBy: 'latency' })), ['demo-vega', 'demo-aurora']);
  assert.deepEqual(ids(selectNodes(fixture, { protocol: 'wireguard', maxLatencyMs: 65, tags: ['demo'] })), ['demo-atlas', 'demo-orion', 'demo-vega']);
  assert.deepEqual(ids(selectNodes(fixture, { search: 'ORION' })), ['demo-orion']);
  assert.deepEqual(ids(selectNodes(fixture, { search: 'DEMO-VEGA' })), ['demo-vega']);
  assert.deepEqual(ids(selectNodes(fixture, { region: 'EU', protocol: 'shadowsocks' })), []);
  assert.deepEqual(ids(selectNodes(fixture, { tags: ['demo', 'fast'], sortBy: 'latency', offset: 1, limit: 1 })), ['demo-vega']);
  assert.deepEqual(ids(selectNodes(fixture, { offset: 1000 })), []);
});

test('unknown latency is last and ties use ascending id in both directions', () => {
  assert.deepEqual(ids(selectNodes(fixture, { sortBy: 'latency' })), ['demo-orion', 'demo-vega', 'demo-atlas', 'demo-aurora', 'demo-nova', 'demo-lyra']);
  assert.deepEqual(ids(selectNodes(fixture, { sortBy: 'latency', direction: 'desc' })), ['demo-nova', 'demo-aurora', 'demo-atlas', 'demo-orion', 'demo-vega', 'demo-lyra']);
  const tied = [node({ id: 'b', name: 'SAME', latencyMs: null }), node({ id: 'a', name: 'same', latencyMs: null })];
  for (const sortBy of ['name', 'region', 'latency']) {
    for (const direction of ['asc', 'desc']) assert.deepEqual(ids(selectNodes(tied, { sortBy, direction })), ['a', 'b']);
  }
});

test('region and name ordering are deterministic and locale independent', () => {
  assert.deepEqual(ids(selectNodes(fixture)), ['demo-atlas', 'demo-aurora', 'demo-lyra', 'demo-nova', 'demo-orion', 'demo-vega']);
  assert.deepEqual(ids(selectNodes(fixture, { sortBy: 'region', direction: 'desc' })), ['demo-atlas', 'demo-lyra', 'demo-aurora', 'demo-vega', 'demo-nova', 'demo-orion']);
});

test('filtering latency is inclusive and excludes unknown values', () => {
  assert.deepEqual(ids(selectNodes(fixture, { maxLatencyMs: 42 })), ['demo-orion', 'demo-vega']);
  assert.equal(selectNodes(fixture, { maxLatencyMs: 60000 }).length, 5);
  assert.equal(selectNodes([node({ latencyMs: 0 })], { maxLatencyMs: 0 }).length, 1);
});

test('caller data is unchanged and returned rows and nested tags are frozen copies', () => {
  const original = structuredClone(fixture);
  const before = structuredClone(original);
  const rows = selectNodes(original, { direction: 'desc' });
  assert.deepEqual(original, before);
  assert.notEqual(rows[0], original.find(item => item.id === rows[0].id));
  assert.throws(() => rows.push(node()), TypeError);
  assert.throws(() => { rows[0].name = 'Changed'; }, TypeError);
  assert.throws(() => rows[0].tags.push('changed'), TypeError);
  assert.deepEqual(original, before);
});

test('catalog bounds reject non arrays, sparse arrays and oversized arrays', () => {
  for (const input of [null, {}, 'demo', undefined, [undefined], new Array(1), new Array(1001)]) {
    assert.equal(validateCatalog(input).valid, false);
  }
  const maximum = Array.from({ length: 1000 }, (_, i) => node({ id: 'demo-' + i }));
  assert.equal(validateCatalog(maximum).valid, true);
  maximum.push(node({ id: 'extra' }));
  assert.equal(validateCatalog(maximum).valid, false);
});

test('rejects unknown, missing, duplicate, inherited and accessor data without reading getters', () => {
  invalid({ extra: 'invented-rejected-value' });
  const missing = node();
  delete missing.port;
  assert.equal(validateCatalog([missing]).valid, false);
  assert.equal(validateCatalog([node(), node()]).valid, false);
  for (const input of [null, [], Object.create(node()), new Date()]) assert.equal(validateCatalog([input]).valid, false);
  const accessor = node();
  Object.defineProperty(accessor, 'name', { get() { throw new Error('Getter must not execute'); }, enumerable: true });
  assert.equal(validateCatalog([accessor]).valid, false);
  const nonEnumerable = node();
  Object.defineProperty(nonEnumerable, 'id', { value: 'demo', enumerable: false });
  assert.equal(validateCatalog([nonEnumerable]).valid, false);
  const poisoned = JSON.parse(JSON.stringify(node()).replace('"id":', '"__proto__":{},"id":'));
  assert.equal(validateCatalog([poisoned]).valid, false);
  assert.equal(Object.prototype.polluted, undefined);
  const symbols = node();
  symbols[Symbol('extra')] = 'demo';
  assert.equal(validateCatalog([symbols]).valid, false);
});

test('nested arrays reject sparse entries, properties, symbols and accessors', () => {
  const accessor = ['demo'];
  Object.defineProperty(accessor, '0', { get() { throw new Error('Getter must not execute'); } });
  const extra = Object.assign(['demo'], { extra: 'demo' });
  const symbolic = ['demo'];
  symbolic[Symbol('extra')] = 'demo';
  const nonIndex = new Array(1);
  nonIndex['4294967295'] = 'demo';
  const nonEnumerable = ['demo'];
  Object.defineProperty(nonEnumerable, '0', { enumerable: false });
  for (const tags of [new Array(1), accessor, extra, symbolic, nonIndex, nonEnumerable]) {
    invalid({ tags });
    assert.throws(() => selectNodes(fixture, { tags }), TypeError);
  }
});

test('synthetic hostname boundaries accept only one valid lower case label', () => {
  for (const host of ['a.example.invalid', 'demo-1.example.invalid', 'a'.repeat(63) + '.example.invalid']) {
    assert.equal(validateCatalog([node({ host })]).valid, true);
  }
  // Every rejection example is also synthetic; no real addresses are used in tests.
  for (const host of ['', 'example.invalid', 'a.b.example.invalid', 'A.example.invalid', '-a.example.invalid',
    'a-.example.invalid', 'a'.repeat(64) + '.example.invalid', 'a.example.invalid.', 'a.example.invalid:443',
    'a.example.invalid/path', ' a.example.invalid', 'a.example.invalid ', 'a.example.invalid\n',
    'a.example.invalid.attacker.invalid', 'https://a.example.invalid', 'user@a.example.invalid',
    '例.example.invalid', 42, null]) invalid({ host });
});

test('IDs, display names, region and protocol reject invalid values', () => {
  for (const id of ['', 'Upper', '0demo', 'a'.repeat(33), 'demo value', null]) invalid({ id });
  for (const name of ['', '-demo', 'a'.repeat(49), '<demo>', 'demo\n', 'demo/name', null]) invalid({ name });
  for (const region of ['eu', '', 'INVALID', null]) invalid({ region });
  for (const protocol of ['WireGuard', 'INVALID', '', null]) invalid({ protocol });
  assert.equal(validateCatalog([node({ id: 'a', name: 'A', tags: [] })]).valid, true);
});

test('port and latency numeric boundaries', () => {
  for (const port of [1, 65535]) assert.equal(validateCatalog([node({ port })]).valid, true);
  for (const port of [0, -1, 65536, 1.5, NaN, Infinity, '51820', null]) invalid({ port });
  for (const latencyMs of [null, 0, 0.5, 60000]) assert.equal(validateCatalog([node({ latencyMs })]).valid, true);
  for (const latencyMs of [-1, 60001, NaN, Infinity, '42', undefined]) invalid({ latencyMs });
});

test('tag limits, uniqueness and alphabet', () => {
  for (const tags of [['demo', 'demo'], ['a', 'b', 'c', 'd', 'e', 'f', 'g'], [''], ['A'], ['a'.repeat(25)], [null], null]) invalid({ tags });
  assert.equal(validateCatalog([node({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] })]).valid, true);
});

test('invalid catalog errors expose only index, fixed field and code', () => {
  const marker = 'invented-private-marker';
  const input = [node({ host: marker, unexpected: marker })];
  const validation = validateCatalog(input);
  assert.equal(JSON.stringify(validation).includes(marker), false);
  assert.throws(() => selectNodes(input, { region: 'NA' }), error => {
    assert.ok(error instanceof CatalogValidationError);
    assert.equal(String(error).includes(marker), false);
    assert.equal(JSON.stringify(error).includes(marker), false);
    assert.deepEqual(Object.keys(error.errors[0]), ['index', 'field', 'code']);
    return true;
  });
});

test('invalid query options fail without echoing values', () => {
  const cases = [null, [], { unexpected: 'invented-private-marker' }, { region: 'eu' }, { protocol: 'INVALID' },
    { search: '<demo>' }, { search: 'a'.repeat(49) }, { tags: ['demo', 'demo'] }, { tags: 'demo' },
    { maxLatencyMs: NaN }, { maxLatencyMs: Infinity }, { maxLatencyMs: -1 }, { maxLatencyMs: 60001 },
    { sortBy: 'port' }, { direction: 'up' }, { limit: 0 }, { limit: 1001 }, { limit: 1.5 },
    { offset: -1 }, { offset: 1001 }, { offset: 0.5 }, { limit: '2' }];
  for (const options of cases) assert.throws(() => selectNodes(fixture, options), { name: 'TypeError', message: 'Invalid query options.' });
});
