# Separation-Logic Visualizer

This repo contains:

- [sepviz](./sepviz): a library for visualizing separation-logic formulas as diagrams. It parses separation-logic formulas from goal strings and renders them using [Graphviz](https://graphviz.org/). Used by both the [sepviz-alectryon](./sepviz-alectryon) app and the [sepviz-vsrocq](https://github.com/epfl-systemf/sepviz-vsrocq) extension.

- [sepviz-alectryon](./sepviz-alectryon): an extension to [Alectryon](https://github.com/cpitclaudel/alectryon) that renders separation-logic formulas as diagrams and animates transitions between them as proof goals evolve.

- [examples](./examples): example rocq projects, containing [cfml-examples](./examples/cfml-examples), [iris-tutorial](./examples/iris-tutorial), [software-foundations-slf](./examples/software-foundations-slf). Their selected proof recordings (Alectryon-generated HTML files, fully text-based, no diagrams and no animations) are pre-generated and pre-stored in `sepviz-alectryon/public`.


## Setup

This project requires [node.js](https://nodejs.org/) (tested on v22.20.0). If you have [nix](https://nixos.org/) installed, you can run `nix develop` to enter a developer shell.

At the project root:
1. run `npm run install:all` to install dependencies;
2. run `npm run preview:all` to build both the [sepviz](./sepviz) library and [sepviz-alectryon](./sepviz-alectryon) app, and post-process the pre-compiled Rocq proofs (HTML pages with fully text-based proofs) into visualized proofs (HTML pages with separation-logic diagrams and animations), output to `alectryon-viz/dist`.

To view the visualized proofs, launch a local web server:
```
cd alectryon/dist
python3 -m http.server 8080
```
then open `https://localhost:8080` in your browser.

### Re-compiling the Rocq proofs

To re-compile the example Rocq projects and re-generate the example proofs in `sepviz-alectryon/public`:

1. Install [Alectryon](https://github.com/cpitclaudel/alectryon) (tested on v2.0.0).
2. Install the dependencies of each Rocq project under `examples/`.
3. Run `npm run build:all` at the project root, which re-compiles each Rocq project, records the proofs, and visualizes them using [sepviz-alectryon](./sepviz-alectryon).

## Demos

- Queue transfer: ![Queue](./gifs/queue-transfer.gif)
- Tree rotation: ![Tree](./gifs/tree-right-rotate.gif)

## List of examples

This repo contains example separation-logic proofs for different frameworks and data structures:

- Using [CFML](https://www.chargueraud.org/softs/cfml/):
  - queues (queue transfer)
  - binary trees (tree rotations)

- Using [Iris](https://iris-project.org/):
  - queues (queue transfer, same proof as before)
  - linked lists (taken from the [Iris tutorial](https://github.com/logsem/iris-tutorial); uses iterated separating conjunction)

- Using the variant of CFML in [Separation Logic Foundations](https://softwarefoundations.cis.upenn.edu/slf-current/index.html), part of the Software Foundations textbook series:
  - [the “Representation predicates” chapter](https://softwarefoundations.cis.upenn.edu/slf-current/Repr.html) (including lists, list segments, trees, stacks)

- Using VST (experimental support):
  - [the "List segments" chapter](https://softwarefoundations.cis.upenn.edu/vc-current/Verif_append1.html) in Verifiable C, part of the Software Foundations textbook series
