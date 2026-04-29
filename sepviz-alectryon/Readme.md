# sepviz-alectryon

An extension to [Alectryon](https://github.com/cpitclaudel/alectryon) that uses the [sepviz](../sepviz) library to:
- render separation-logic formulas as diagrams;
- animate transitions between them as proof goals evolve.

## Setup

Read the outer [Readme.md](../Readme.md) for setup instructions.

The following npm commands are available for this directory:
1. `npm install`: install dependencies;
2. `npm run preview`: build the `sepviz-alectryon` app and process pre-compiled Rocq proofs;
3. `npm run build`: recompile Rocq proofs, and `npm run preview`.

### Output
-
After `npm run preview`, the `dist` folder is structured as follows:

```
dist
├── sepviz-alectryon.css
├── sepviz-alectryon.js
├── cfml-examples
│   ├── ... some other css and js files
│   ├── the cfml example htmls, e.g., CFML-LiterateQueue.html
│   └── sepviz.yaml # the sepviz config for cfml
├── iris-tutorial
│   ├── ... some other css and js files
│   ├── the iris example htmls, e.g., Iris-queue.html and Iris-linked_lists.html
│   └── sepviz.yaml
└── software-foundations-slf
│   ├── ... some other css and js files
    ├── the slf example htmls, SoftwareFoundations-SLF-Repr.html
│   └── sepviz.yaml
```
