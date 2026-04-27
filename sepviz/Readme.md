# sepviz

A library for visualizing separation-logic formulas as diagrams. It parses separation-logic formulas from goal strings and renders them using [Graphviz](https://graphviz.org/). Used by both the [sepviz-alectryon](./sepviz-alectryon) app and the [sepviz-vsrocq](https://github.com/epfl-systemf/sepviz-vsrocq) extension.

## Structure

- `sep-grammar.g`: Grammar of a canonical separation-logic language. Rocq projects should define notations that print separation-logic formulas to this grammar. See [sepviz notations for Iris](https://github.com/epfl-systemf/sepviz-iris-tutorial/blob/viz/theories/sepviz_notations.v) as an example.

- `parser.ts`: A parse that parses input goal strings in two steps:
   1. Parses separation-logic formulas from the goal string using the PEG parser generated from `sep-grammar.g`;
   2. Transforms the resulting AST into proper heap propositions.

- `dot-builder`: Builds a Graphviz DOT program representing the heap from a list of `PointsTo` propositions;

- `render.ts` (top-level API): Takes a goal string and renders it to HTML.

## Rendering Configuration

`sepviz` can be configured via a yaml file (default: `sepviz.yaml`) loaded at runtime. It controls fonts, graph layout, and how heap constructors and values are rendered.

- font: font settings used across the diagram
    - name: font family (default: Courier)
    - size: font size in points (default: 11)
    - existVarColor: color for existential variables (default: #3465a4)
- graph: Graphviz graph-level attributes (e.g. rankdir, ranksep, nodesep, splines)
- edge: Graphviz edge-level attributes (e.g. arrowsize, minlen)
- node: Graphviz node-level attributes (e.g. shape, margin)
- constr: per-constructor rendering config (see below)
- value: per-value rendering config (e.g. custom labels or unique IDs)

### constr

Each entry is keyed by constructor (heap representation predicate) name (e.g., `isList`) and supports:

- label: display label (default: the constructor name).
- drawBorder: whether to draw a border around the node table (default: false).
- inPort: the input port used for incoming edges (default: the first in-table argument's port).
- args: per-argument config, keyed by argument index (starting from 0):
    - inTable: whether the argument is rendered inside the node table (default: true if drawBorder is set).
    - forceEdge: always draw an edge to this argument, even if it is not a known pointer (default: false). Useful for tail pointers (e.g., in list segments).
    - inPort / outPort: port names for edge attachment (default: `in$i` / `out$i`).
