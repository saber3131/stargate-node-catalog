'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const cli = path.join(__dirname, '..', 'src', 'cli.js');
const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 5000 });

test('CLI filters and sorts the bundled synthetic data as JSON', () => {
  const result = run(['--region', 'EU', '--sort', 'latency', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout).map(node => node.id), ['demo-vega', 'demo-aurora']);
});

test('CLI combines tags, latency, direction and pagination', () => {
  const result = run(['--tag', 'demo', '--tag', 'fast', '--max-latency', '42', '--sort', 'latency', '--direction', 'desc', '--offset', '1', '--limit', '1', '--json']);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout).map(node => node.id), ['demo-vega']);
});

test('text, empty results and help label the synthetic boundary', () => {
  const text = run([]);
  assert.equal(text.status, 0);
  assert.match(text.stdout, /SYNTHETIC DEMO ONLY/);
  assert.match(text.stdout, /6 synthetic result/);
  const empty = run(['--search', 'no-such-demo', '--json']);
  assert.equal(empty.status, 0);
  assert.deepEqual(JSON.parse(empty.stdout), []);
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /No file, URL, stdin or environment input/);
});

test('CLI rejects arbitrary paths, input flags and malformed numbers without reflecting them', () => {
  const cases = [
    ['invented-private-marker'], ['--file', 'invented-private-marker'], ['--url', 'https://demo.example.invalid'],
    ['--search'], ['--region', 'eu'], ['--sort', 'port'], ['--limit', '0'], ['--limit', '1.5'],
    ['--limit', 'Infinity'], ['--limit', '0x10'], ['--limit', ' 2'], ['--offset', '-1'],
    ['--max-latency', '1e2'], ['--tag', 'demo', '--tag', 'demo'], ['--region', 'EU', '--region', 'NA'],
    ['--json', '--json'], ['--help', '--json'], ['--search', '<invented-private-marker>']
  ];
  for (const args of cases) {
    const result = run(args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'Invalid arguments. Run node src/cli.js --help.\n');
  }
});
