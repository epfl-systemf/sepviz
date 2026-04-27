# Sepviz-Alectryon App

## Building

```
npm install
```

### Example proofs generation
-
After `npm run build`, the `dist` folder is structured as follows:

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
