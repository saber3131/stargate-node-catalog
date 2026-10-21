/* SPDX-License-Identifier: MIT */
/* Newly created independent Stargate VPN component. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.defineProperty(root, 'StargateCatalog', { value: api });
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const REGIONS = Object.freeze(['APAC', 'EU', 'NA']);
  const PROTOCOLS = Object.freeze(['wireguard', 'openvpn', 'shadowsocks']);
  const FIELDS = ['id', 'name', 'region', 'protocol', 'host', 'port', 'latencyMs', 'tags'];
  const MAX_NODES = 1000;
  const HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.example\.invalid$/;
  const LABEL = /^[a-z][a-z0-9-]{0,31}$/;
  const TAG = /^[a-z][a-z0-9-]{0,23}$/;
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const plain = value => value !== null && typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const dataOnly = value => Reflect.ownKeys(value).every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && own(descriptor, 'value') && descriptor.enumerable;
  });
  const dataArray = value => Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype &&
    Reflect.ownKeys(value).length === value.length + 1 && Reflect.ownKeys(value).every(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      const index = typeof key === 'string' ? Number(key) : NaN;
      return typeof key === 'string' && own(descriptor, 'value') &&
        (key === 'length' || (descriptor.enumerable && Number.isSafeInteger(index) &&
          index >= 0 && index < value.length && String(index) === key));
    });
  const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;

  class CatalogValidationError extends Error {
    constructor(errors) {
      super('Catalog rejected. Use synthetic data matching the documented schema.');
      this.name = 'CatalogValidationError';
      this.errors = errors;
    }
  }

  function validateCatalog(input) {
    const errors = [];
    const add = (index, field, code) => errors.push(Object.freeze({ index, field, code }));
    if (!Array.isArray(input) || input.length > MAX_NODES || !dataArray(input)) {
      add(null, 'catalog', 'expected_array_up_to_1000');
      return Object.freeze({ valid: false, errors: Object.freeze(errors) });
    }
    const ids = new Set();
    for (let index = 0; index < input.length; index++) {
      const node = input[index];
      if (!plain(node) || !dataOnly(node)) {
        add(index, 'node', 'expected_plain_data_object');
        continue;
      }
      if (Reflect.ownKeys(node).some(key => !FIELDS.includes(key))) {
        add(index, 'node', 'unknown_fields');
      }
      for (const field of FIELDS) {
        if (!own(node, field)) add(index, field, 'required');
      }
      if (typeof node.id !== 'string' || !LABEL.test(node.id)) add(index, 'id', 'invalid_label');
      else if (ids.has(node.id)) add(index, 'id', 'duplicate');
      else ids.add(node.id);
      if (typeof node.name !== 'string' || node.name.length > 48 ||
          !/^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(node.name)) add(index, 'name', 'invalid_display_name');
      if (!REGIONS.includes(node.region)) add(index, 'region', 'unsupported');
      if (!PROTOCOLS.includes(node.protocol)) add(index, 'protocol', 'unsupported');
      if (typeof node.host !== 'string' || !HOST.test(node.host)) add(index, 'host', 'synthetic_host_required');
      if (!Number.isInteger(node.port) || node.port < 1 || node.port > 65535) add(index, 'port', 'invalid_port');
      if (node.latencyMs !== null && (!Number.isFinite(node.latencyMs) || node.latencyMs < 0 || node.latencyMs > 60000)) {
        add(index, 'latencyMs', 'invalid_synthetic_latency');
      }
      if (!Array.isArray(node.tags) || node.tags.length > 6 || !dataArray(node.tags) ||
          node.tags.some(tag => typeof tag !== 'string' || !TAG.test(tag)) ||
          new Set(node.tags).size !== node.tags.length ||
          Object.keys(node.tags).length !== node.tags.length) add(index, 'tags', 'invalid_tags');
    }
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function queryOptions(options) {
    const keys = ['region', 'protocol', 'search', 'tags', 'maxLatencyMs', 'sortBy', 'direction', 'limit', 'offset'];
    const bad = () => { throw new TypeError('Invalid query options.'); };
    if (!plain(options) || !dataOnly(options) || Reflect.ownKeys(options).some(key => !keys.includes(key))) bad();
    const q = { sortBy: 'name', direction: 'asc', limit: MAX_NODES, offset: 0, ...options };
    if (own(q, 'region') && !REGIONS.includes(q.region)) bad();
    if (own(q, 'protocol') && !PROTOCOLS.includes(q.protocol)) bad();
    if (own(q, 'search') && (typeof q.search !== 'string' || q.search.length > 48 || !/^[A-Za-z0-9 -]*$/.test(q.search))) bad();
    if (own(q, 'tags') && (!Array.isArray(q.tags) || q.tags.length > 6 || !dataArray(q.tags) ||
      q.tags.some(tag => typeof tag !== 'string' || !TAG.test(tag)) ||
      Object.keys(q.tags).length !== q.tags.length || new Set(q.tags).size !== q.tags.length)) bad();
    if (own(q, 'maxLatencyMs') && (!Number.isFinite(q.maxLatencyMs) || q.maxLatencyMs < 0 || q.maxLatencyMs > 60000)) bad();
    if (!['name', 'latency', 'region'].includes(q.sortBy) || !['asc', 'desc'].includes(q.direction)) bad();
    if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > MAX_NODES ||
      !Number.isInteger(q.offset) || q.offset < 0 || q.offset > MAX_NODES) bad();
    return q;
  }

  function selectNodes(input, options = {}) {
    const result = validateCatalog(input);
    if (!result.valid) throw new CatalogValidationError(result.errors);
    const q = queryOptions(options);
    const search = (q.search || '').toLowerCase();
    const rows = input.filter(node =>
      (!q.region || node.region === q.region) &&
      (!q.protocol || node.protocol === q.protocol) &&
      (!search || node.name.toLowerCase().includes(search) || node.id.includes(search)) &&
      (!q.tags || q.tags.every(tag => node.tags.includes(tag))) &&
      (!own(q, 'maxLatencyMs') || (node.latencyMs !== null && node.latencyMs <= q.maxLatencyMs)));
    rows.sort((a, b) => {
      let order;
      if (q.sortBy === 'latency') {
        // Unknown synthetic latency is always last, in both directions.
        if (a.latencyMs === null || b.latencyMs === null) {
          if (a.latencyMs !== b.latencyMs) return a.latencyMs === null ? 1 : -1;
          return compareText(a.id, b.id);
        }
        order = a.latencyMs - b.latencyMs;
      } else {
        const key = q.sortBy === 'name' ? 'name' : 'region';
        order = compareText(a[key].toLowerCase(), b[key].toLowerCase());
      }
      return (q.direction === 'desc' ? -order : order) || compareText(a.id, b.id);
    });
    return Object.freeze(rows.slice(q.offset, q.offset + q.limit).map(node =>
      Object.freeze({ ...node, tags: Object.freeze([...node.tags]) })));
  }
  return Object.freeze({ REGIONS, PROTOCOLS, MAX_NODES, CatalogValidationError, validateCatalog, selectNodes });
});
