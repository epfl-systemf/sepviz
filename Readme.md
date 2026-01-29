# Separation Logic Visualizer

This repository contains a TypeScript project that takes the Alectryon-generated HTML files and produces visualized versions in which separation-logic formulas are rendered as diagrams, with animated transitions.

## How to build

Require `node.js`.

If using Nix, prefix the `npm` commands below with `USE_NIX=1` or run `export USE_NIX=1`.

Install dependencies: `npm install`

Build: `npm run build`

## Demo animations

- Queue transfer: ![Queue](./gifs/queue-transfer.gif)

- Tree rotation: ![Tree](./gifs/tree-right-rotate.gif)
