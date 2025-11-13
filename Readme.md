# Separation Logic Visualizer

This repository contains two sub-projects:

- `example-proofs`: a Rocq project with example proofs about data structure APIs, developed using separation logic. The build process compiles the Rocq proofs and records them with Alectryon, producing HTML documentation (text-based, no diagrams);

- `sep-viz`: a TypeScript project that takes the Alectryon-generated HTML files and produces visualized versions in which separation-logic formulas are rendered as diagrams, with animated transitions.

Demo animations:

- Queue transfer: ![Queue](./gifs/queue-transfer.gif)

- Tree rotation: ![Tree](./gifs/tree-right-rotate.gif)
