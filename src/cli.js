#!/usr/bin/env node
'use strict';
const { selectNodes } = require('./catalog.js');
const syntheticNodes = require('../examples/synthetic-nodes.js');
const HELP = `Stargate Node Catalog - synthetic offline demonstration
Usage: node src/cli.js [options]
  --region APAC|EU|NA
  --protocol wireguard|openvpn|shadowsocks
  --search TEXT          Match an invented name or id (case insensitive)
  --tag LABEL            Require a tag (may repeat with distinct values)
  --max-latency NUMBER   Exclude unknown latency and values above NUMBER
  --sort name|latency|region
  --direction asc|desc
  --limit NUMBER         1..1000
  --offset NUMBER        0..1000
  --json                 Print synthetic results as JSON
  --help
Only the bundled synthetic fixture is used. No file, URL, stdin or environment input.
`;

function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write(HELP);
    return;
  }
  const valueFlags = new Map([
    ['--region', 'region'], ['--protocol', 'protocol'], ['--search', 'search'],
    ['--max-latency', 'maxLatencyMs'], ['--sort', 'sortBy'], ['--direction', 'direction'],
    ['--limit', 'limit'], ['--offset', 'offset']
  ]);
  const numeric = new Set(['maxLatencyMs', 'limit', 'offset']);
  const options = {};
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--json') {
      if (json) throw new TypeError();
      json = true;
      continue;
    }
    const key = valueFlags.get(flag);
    if (!key && flag !== '--tag') throw new TypeError();
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new TypeError();
    if (flag === '--tag') {
      (options.tags ||= []).push(value);
    } else {
      if (Object.prototype.hasOwnProperty.call(options, key)) throw new TypeError();
      if (numeric.has(key) && !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new TypeError();
      options[key] = numeric.has(key) ? Number(value) : value;
    }
  }
  const rows = selectNodes(syntheticNodes, options);
  if (json) process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
  else {
    process.stdout.write('SYNTHETIC DEMO ONLY - no connections or measurements\n');
    for (const node of rows) {
      process.stdout.write(`${node.id}\t${node.region}\t${node.protocol}\t${node.latencyMs === null ? 'unknown' : node.latencyMs + ' ms (invented)'}\t${node.host}\n`);
    }
    process.stdout.write(`${rows.length} synthetic result(s)\n`);
  }
}
try { main(process.argv.slice(2)); }
catch {
  // Never echo rejected input, paths, stack traces or arbitrary values.
  process.stderr.write('Invalid arguments. Run node src/cli.js --help.\n');
  process.exitCode = 2;
}
