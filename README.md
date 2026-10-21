# Stargate Node Catalog

星际之门 VPN 的独立离线节点目录工具，采用 MIT 许可证。**本次全新实现**，没有从现有商业代码或公开压缩包提取代码，不声称已经集成到产品、有既有用户、下载量或维护历史。

Newly created, standalone MIT-licensed component for Stargate VPN's open source showcase. It validates, filters and deterministically sorts a **synthetic** node directory. The library, CLI and local demo share the same implementation. This is a node directory tool, not a complete VPN or a live connection service.

**License:** [MIT](LICENSE). Reuse, modification, distribution and commercial use are permitted under that license, including its notice requirements. The package keeps `private: true` to prevent accidental publication to a package registry; this setting does not determine GitHub repository visibility. The project makes no claim of established users, downloads, stars, product integration or prior maintenance history.

## Purpose and boundaries

- Real functionality: strict schema validation; combined region/protocol/name/tag/maximum-latency filters; name/region/latency sorting; pagination; structured errors that do not echo rejected values.
- All fixture labels, hostnames and latency values are invented. Protocol names are metadata labels only. No DNS lookup, ping, HTTP request, VPN connection, subscription import, account, payment, administration or production integration exists.
- Only hosts of the form `label.example.invalid` are accepted. There are no credentials or authentication fields. Unknown fields are rejected.
- This is **not an anonymizer, secret scanner, full VPN implementation or compatibility validator** for an existing VPN client. Strings such as names and IDs could still contain a secret supplied by a caller. Use only newly invented synthetic input; never paste real configurations, subscription text, credentials, customer data or operational metadata.

## Run locally, entirely offline

Requires a locally installed Node.js 22 or newer. There are no third-party packages and no dependency installation step.

```sh
node --test
node src/cli.js --region EU --sort latency --json
node src/cli.js --protocol wireguard --tag demo --max-latency 65
node src/cli.js --sort latency --direction desc --limit 2
node src/cli.js --help
```

The CLI only loads `examples/synthetic-nodes.js`. It does not accept paths, URLs, JSON input, stdin, configuration files or environment settings. Invalid arguments return exit code 2 and a fixed error message. Valid runs return 0. `--help` is used alone. Numeric flags use unsigned decimal notation; `limit` and `offset` must be integers. Repeated flags are rejected except distinct `--tag` values.

For the visual demo, open `demo/index.html` directly in a local browser. It needs no server or build step. Every script and style is local; the page denies network connections through its content security policy. Filters work entirely in memory. JavaScript must be enabled. The demo deliberately has no import or connect button.

Browser loading and visual QA were not completed in this task: the available browser tool blocked the local `file:` protocol. In-process DOM tests exercise the actual page event handlers, but do not verify browser CSP enforcement, file-origin compatibility, layout or visual accessibility. Those remain unverified limitations of this initial version.

## Use the module

```js
const { validateCatalog, selectNodes } = require('./src/catalog.js');
const sample = require('./examples/synthetic-nodes.js');

const validation = validateCatalog(sample); // { valid: true, errors: [] }
const selected = selectNodes(sample, {
  region: 'EU', tags: ['demo'], sortBy: 'latency', direction: 'asc', limit: 2
});
console.log(selected.map(node => node.id)); // ['demo-vega', 'demo-aurora']
```

In a classic browser script, the same file exposes `StargateCatalog`. No runtime dependencies are required. `selectNodes` validates its entire input before filtering, returns frozen copies including tags, and never sorts or edits the caller's array.

## Synthetic schema

Each node must contain exactly these eight own data fields. Maximum catalog size: 1,000 nodes. Empty catalogs are valid. Sparse arrays and non-data objects are unsupported.

| Field | Accepted value |
| --- | --- |
| `id` | Unique, lowercase ASCII label; starts with a letter; then letters, digits or hyphens; 1–32 characters |
| `name` | ASCII letters, digits, spaces or hyphens; starts with a letter/digit; 1–48 characters |
| `region` | `APAC`, `EU` or `NA` (invented classifications) |
| `protocol` | `wireguard`, `openvpn` or `shadowsocks` (labels only) |
| `host` | One lowercase ASCII hostname label, 1–63 characters, followed by `.example.invalid`; no leading/trailing hyphen |
| `port` | Integer from 1 through 65,535; metadata only |
| `latencyMs` | Invented finite number from 0 through 60,000, or `null` for unknown |
| `tags` | Up to 6 unique lowercase ASCII labels; starts with a letter; 1–24 characters each |

`validateCatalog` returns `{ valid, errors }`. Each error has only an index, a fixed field name and a fixed code. `selectNodes` throws `CatalogValidationError` on invalid catalogs and `TypeError` on invalid query options; neither includes rejected input values. This is an in-process data API, not a sandbox for hostile JavaScript objects or proxies.

## Query semantics

All filters combine with AND. `region` and `protocol` match exactly and are case sensitive. `search` matches an ID or name substring case insensitively; accepts up to 48 ASCII letters, digits, spaces or hyphens. All requested `tags` must be present. `maxLatencyMs` excludes unknown latency and uses an inclusive bound.

`sortBy` is `name` (default), `region` or `latency`; `direction` is `asc` (default) or `desc`. Text uses case insensitive ASCII ordering, independent of machine locale. Unknown latency always sorts last in both directions. Ties use the unique ID in ascending order in both directions. `offset` defaults to 0 (range 0–1,000); `limit` defaults to 1,000 (range 1–1,000). Pagination occurs after filtering and sorting. Unknown options are rejected.

## Validation and provenance

Tests cover combined filters, tie-breaking, unknown latency, mutation protection, schema boundaries, invalid host forms, errors without value reflection and CLI behavior. Run `node --test` to reproduce offline. No test contacts a network service.

All implementation, tests, demo UI and sample data in this component were newly authored for this isolated task. No existing repository history, brand artwork, screenshots, binaries, commercial code, live service addresses or operational data were copied. See `THIRD_PARTY_NOTICES.md` for dependency and attribution scope. This component makes no claim about program eligibility or award outcomes.
