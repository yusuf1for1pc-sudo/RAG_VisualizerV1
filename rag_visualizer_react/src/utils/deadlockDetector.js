/**
 * Detects deadlocks in a Resource Allocation Graph.
 * For this visualizer, we implement cycle detection using DFS.
 * 
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @returns {Array} - List of node IDs involved in the deadlock
 */
export const detectDeadlock = (nodes, edges) => {
  const adj = {};
  nodes.forEach(node => {
    adj[node.id] = [];
  });

  edges.forEach(edge => {
    if (adj[edge.source]) {
      adj[edge.source].push(edge.target);
    }
  });

  const visited = new Set();
  const recStack = new Set();
  const deadlockedNodes = new Set();

  const dfs = (u, path) => {
    visited.add(u);
    recStack.add(u);
    path.push(u);

    for (const v of adj[u]) {
      if (!visited.has(v)) {
        if (dfs(v, [...path])) return true;
      } else if (recStack.has(v)) {
        // Cycle detected!
        // Find the start of the cycle in the current path
        const cycleStartIndex = path.indexOf(v);
        if (cycleStartIndex !== -1) {
          path.slice(cycleStartIndex).forEach(nodeId => deadlockedNodes.add(nodeId));
        }
        return true;
      }
    }

    recStack.delete(u);
    return false;
  };

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  });

  return Array.from(deadlockedNodes);
};
