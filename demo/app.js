'use strict';
(function () {
  const controls = Object.fromEntries(['search', 'region', 'protocol', 'sort', 'direction'].map(id => [id, document.getElementById(id)]));
  const body = document.getElementById('rows');
  const summary = document.getElementById('summary');
  const empty = document.getElementById('empty');
  function render() {
    const options = { sortBy: controls.sort.value, direction: controls.direction.value, search: controls.search.value };
    if (controls.region.value) options.region = controls.region.value;
    if (controls.protocol.value) options.protocol = controls.protocol.value;
    let nodes;
    try { nodes = StargateCatalog.selectNodes(StargateSyntheticNodes, options); }
    catch {
      body.replaceChildren();
      summary.textContent = 'Search accepts letters, numbers, spaces and hyphens only.';
      empty.hidden = true;
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const node of nodes) {
      const tr = document.createElement('tr');
      const name = document.createElement('th');
      name.scope = 'row';
      const title = document.createElement('span');
      title.className = 'node-name';
      title.textContent = node.name;
      const host = document.createElement('span');
      host.className = 'host';
      host.textContent = node.host;
      name.append(title, host);
      tr.append(name);
      for (const value of [node.region, node.protocol, node.latencyMs === null ? 'Unknown' : `${node.latencyMs} ms (invented)`]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        tr.append(cell);
      }
      fragment.append(tr);
    }
    body.replaceChildren(fragment);
    empty.hidden = nodes.length > 0;
    summary.textContent = `${nodes.length} of ${StargateSyntheticNodes.length} synthetic nodes`;
  }
  for (const control of Object.values(controls)) control.addEventListener('input', render);
  document.getElementById('reset').addEventListener('click', () => {
    controls.search.value = '';
    controls.region.value = '';
    controls.protocol.value = '';
    controls.sort.value = 'name';
    controls.direction.value = 'asc';
    render();
    controls.search.focus();
  });
  render();
})();
