/* Entirely invented fixture. Hosts, labels and latencies do not describe a service. */
(function (root, factory) {
  'use strict';
  const nodes = factory();
  if (typeof module === 'object' && module.exports) module.exports = nodes;
  else Object.defineProperty(root, 'StargateSyntheticNodes', { value: nodes });
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  return Object.freeze([
    { id: 'demo-orion', name: 'Orion Demo', region: 'APAC', protocol: 'wireguard', host: 'orion.example.invalid', port: 51820, latencyMs: 42, tags: ['demo', 'fast'] },
    { id: 'demo-aurora', name: 'Aurora Demo', region: 'EU', protocol: 'openvpn', host: 'aurora.example.invalid', port: 1194, latencyMs: 85, tags: ['demo'] },
    { id: 'demo-lyra', name: 'Lyra Demo', region: 'NA', protocol: 'shadowsocks', host: 'lyra.example.invalid', port: 8388, latencyMs: null, tags: ['demo', 'unmeasured'] },
    { id: 'demo-vega', name: 'Vega Demo', region: 'EU', protocol: 'wireguard', host: 'vega.example.invalid', port: 51820, latencyMs: 42, tags: ['demo', 'fast'] },
    { id: 'demo-nova', name: 'Nova Demo', region: 'APAC', protocol: 'openvpn', host: 'nova.example.invalid', port: 1194, latencyMs: 120, tags: ['demo'] },
    { id: 'demo-atlas', name: 'Atlas Demo', region: 'NA', protocol: 'wireguard', host: 'atlas.example.invalid', port: 51820, latencyMs: 65, tags: ['demo'] }
  ].map(node => Object.freeze({ ...node, tags: Object.freeze(node.tags) })));
});
