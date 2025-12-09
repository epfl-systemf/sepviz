type Node = string;

interface Edge {
  src: Node;
  dst: Node;
}

interface NodeState {
  visited: boolean;
  onStack: boolean;
  index: number;
  lowest: number;
}

function tarjanSCC(
  root: Node,
  graph: Record<Node, Node[]>
): Record<Node, Node[]> {
  const state: Record<Node, NodeState> = {};
  Object.keys(graph).forEach((n) => {
    state[n] = {
      visited: false,
      onStack: false,
      index: -1,
      lowest: -1,
    };
  });
  let index = 0;
  const stack: Node[] = [];
  const SCCs: Record<Node, Node[]> = {};
  dfs(root);
  Object.keys(graph).forEach((n) => {
    if (!state[n].visited) dfs(n);
  });

  function dfs(n: Node) {
    const s = state[n];
    s.visited = true;
    s.onStack = true;
    s.index = index++;
    s.lowest = s.index;
    stack.push(n);
    graph[n].forEach((w) => {
      if (!state[w].visited) {
        dfs(w);
        s.lowest = Math.min(s.lowest, state[w].lowest);
      } else if (state[w].onStack) {
        s.lowest = Math.min(s.lowest, state[w].lowest);
      }
    });
    if (s.index === s.lowest) {
      // n is the root of the SCC
      const scc: Node[] = [];
      while (stack.length > 0) {
        const w = stack.pop();
        if (!w) break; // for type inference
        state[w].onStack = false;
        scc.push(w);
        if (w === n) break;
      }
      SCCs[n] = scc;
    }
  }

  return SCCs;
}

function topoSortDAG(
  root: Node,
  graph: Record<Node, Node[]>,
  previousOrder: Record<Node, number> | null
): Node[] {
  const visited: Record<Node, boolean> = {};
  Object.keys(graph).forEach((n) => (visited[n] = false));
  const sorted: Node[] = [];

  // TODO: we can order the order roots in (reversed) alphabet order as well.
  Object.keys(graph).forEach((n) => {
    if (!visited[n] && n !== root) dfs(n);
  });
  dfs(root);

  function dfs(n: Node) {
    if (visited[n]) return;
    visited[n] = true;
    graph[n].sort((n1, n2) => -compareNode(previousOrder)(n1, n2));
    graph[n].forEach((w) => dfs(w));
    sorted.push(n);
  }

  return sorted.reverse();
}

function compareNode(previousOrder: Record<Node, number> | null) {
  // The resulting topo order for branches is (e.g., when a -> b, a -> c):
  // - If it is a new graph, by ascending alphabet order: b, c;
  // - otherwise:
  //   + if both branches (b and c) are in the previous order, sort by previous order;
  //   + if only one branch is in the previous order, this branch takes priority;
  //   + if both branch are not in the previous order, sort by ascending alphabet order.
  return (n1: Node, n2: Node) => {
    if (!previousOrder) return n1.localeCompare(n2);
    if (n1 in previousOrder && n2 in previousOrder)
      return previousOrder[n1] - previousOrder[n2];
    if (n1 in previousOrder) return -1;
    if (n2 in previousOrder) return 1;
    return n1.localeCompare(n2);
  };
}

// Sort a connected graph that might contain circles in topological order.
// When there are multiple choices (branches), respect the previous order.
export function sort(
  root: Node,
  nodes: Node[],
  edges: Edge[],
  previousOrder: Record<Node, number> | null
): Record<Node, number> {
  // The original graph may contain circles. Find strongly connected components.

  const graph: Record<Node, Node[]> = {};
  nodes.forEach((n) => (graph[n] = []));
  edges.forEach((e) => graph[e.src].push(e.dst));
  const SCCs: Record<Node, Node[]> = tarjanSCC(root, graph);

  // Convert the graph to a DAG by condensation.

  const nodeMap: Record<Node, Node> = {};
  // Every member of a SCC maps to the SCC root in the new graph.
  Object.entries(SCCs).forEach(([sccRoot, scc]) => {
    if (scc.length === 0) return;
    if (scc.length === 1) {
      nodeMap[sccRoot] = sccRoot;
      return;
    }
    scc.forEach((w) => (nodeMap[w] = sccRoot));
  });
  const condensedGraph: Record<Node, Node[]> = {};
  Object.entries(graph).forEach(([n, successors]) => {
    const v = nodeMap[n];
    if (!condensedGraph[v]) condensedGraph[v] = [];
    condensedGraph[v].push(...successors.map((w) => nodeMap[w]));
  });
  Object.entries(condensedGraph).forEach(([n, successors]) => {
    condensedGraph[n] = [...new Set(successors)];
  });

  // Perform topological sort on the DAG.
  // In the case of branches, respect the previous order.

  const condensedTopoOrder = topoSortDAG(
    nodeMap[root],
    condensedGraph,
    previousOrder
  );

  // Sort each SCC's members and insert them to complete the order.

  const topoOrder: Node[] = [];
  condensedTopoOrder.forEach((n) => {
    if (!SCCs[n]) topoOrder.push(n);
    else {
      SCCs[n].sort(compareNode(previousOrder));
      topoOrder.push(...SCCs[n]);
    }
  });

  const topoOrderMap: Record<Node, number> = {};
  topoOrder.forEach((n, idx) => (topoOrderMap[n] = idx));

  return topoOrderMap;
}
