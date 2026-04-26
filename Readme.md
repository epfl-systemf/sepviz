# Separation-Logic Visualizer


## Repo structure

- `sep-viz`: a library for visualizing separation-logic formulas as diagrams. It parses separation-logic formulas from goal strings and renders them using Graphviz. Used by both the `alectryon-viz` app and the `vsrocq-fork` extension.

- `alectryon-viz`: an extension to Alectryon that renders separation-logic formulas as diagrams and animates transitions between them as proof goals evolve.

- `examples`: example rocq projects, containing `cfml-examples`, `iris-tutorial`, `software-foundations-slf`. Their selected proof recordings (Alectryon-generated HTML files, fully text-based, no diagrams and no animations) are pre-generated and pre-stored in `alectryon-viz/public`.


## Build

This project requires `node.js` (tested on v22.20.0). If you have [nix](https://nixos.org/) installed, you can run `nix develop -c "export USE_NIX=1"` to enter a developer shell.

At the project root:
1. run `npm run install:all` to install dependencies;
2. run `npm run build:all` to build both the `sep-viz` library and `alectryon-viz` app, and process the example proofs from `alectryon-viz/public`. The visualized proofs (HTML pages with separation-logic diagrams and animations) are written to the `alectyon-viz/dist` directory.

To view the result, you can launch a webserver by running:
```
cd alectryon/dist
python3 -m http.server 8080
```
and then open `https://localhost:8080` in the browser.


### Building the proofs from scratch

If you want to re-generate the example proofs in `alectryon-viz/public`:
1. Install [Alectryon](https://github.com/cpitclaudel/alectryon) (tested on v2.0.0);
2. Install the dependencies of every rocq projects in `examples`;
3. Run `npm run preview:all` at this repo's project root, which will re-compile each rocq project, record the proofs, and visualize them using `alectryon-viz`.


## Examples

- [CFML](https://www.chargueraud.org/softs/cfml/) examples, including queues (queue transfer) and binary trees (tree rotations).
- The queue transfer example in [Iris](https://iris-project.org/).
- Textbook [Software Foundations: Separation Logic Foundations](https://softwarefoundations.cis.upenn.edu/slf-current/index.html) examples (including lists, list segments, trees, stacks). The textbook which uses a variant of CFML.


## Animation demos

- Queue transfer: ![Queue](./gifs/queue-transfer.gif)
- Tree rotation: ![Tree](./gifs/tree-right-rotate.gif)
