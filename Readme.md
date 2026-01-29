# Separation Logic Visualizer

This repository contains a TypeScript project that takes the Alectryon-generated HTML files and produces visualized versions in which separation-logic formulas are rendered as diagrams, with animated transitions.

## How to build this artifact?

This artifact requires `node.js`, and it is tested under version 22.20.0. If you use [Nix](https://nixos.org/), you can prefix following the `npm` commands below with `USE_NIX=1` or run `export USE_NIX=1`.

1. Run `npm install` to install all dependencies;
2. The example proof recordings (Alectryon-generated HTML files, fully text-based, no diagrams, no animations) are pre-stored in the `/public` directory. To visualize them, run `npm run build`. The generated visualized proofs will be in the `dist` directory.
3. To view the visualization, you can launch a webserver:
```
cd dist
python3 -m http.server 8080
```
And open `https://localhost:8080` on your browser.

### Building the proofs from scratch

 If you want to generate these proof recordings by yourself as well, you need to:
1. Install [Alectryon](https://github.com/cpitclaudel/alectryon) (tested on v1.4.0);
2. Install the dependencies of all submodules (the Rocq source code).
3. Build the submodules one by one according to the Readme of each Rocq project. Alternatively, if you use nix, you can run `USE_NIX=1 npm run gen:proofs` and then `USE_NIX=1 npm run build`.

## What does this artifact contain?

It contains the visualization source code and the example configuration (`public/renderConfig.yaml`), and the following examples:
- [CFML](https://www.chargueraud.org/softs/cfml/) examples, including queues (queue transfer) and binary trees (tree rotations).
- The queue transfer example in [Iris](https://iris-project.org/).
- Textbook [Software Foundations: Separation Logic Foundations](https://softwarefoundations.cis.upenn.edu/slf-current/index.html) examples (including lists, list segments, trees, stacks). The textbook which uses a variant of CFML.

## Animation demos

- Queue transfer: ![Queue](./gifs/queue-transfer.gif)
- Tree rotation: ![Tree](./gifs/tree-right-rotate.gif)
