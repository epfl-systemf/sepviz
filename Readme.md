# Sepviz

[▶️ Try the online demo interactively](https://systemf.epfl.ch/etc/sepviz/)

![Sepviz demo](examples/gifs/queue-transfer.png)

A library for visualizing and animating separation-logic formulas as memory diagrams.  This repo contains:

- [sepviz](./sepviz): The visualization library, written in TypeScript. It parses separation-logic formulas from Rocq goal strings, renders them using [Graphviz](https://graphviz.org/), and animates them using [d3](https://d3js.org/).

- [sepviz-alectryon](./sepviz-alectryon): Glue code to use Sepviz with [Alectryon](https://github.com/cpitclaudel/alectryon).

- [sepviz-vsrocq](./sepviz-vsrocq): A fork of the VSRocq IDE to visualize and animate separation logic proofs while writing them.

- [interop](./interop): Rocq notations allowing Sepviz to understand many [CFML](https://github.com/charguer/cfml), [SLF](https://softwarefoundations.cis.upenn.edu/slf-current/index.html), and [Iris](https://iris-project.org/) formulae.

- [examples](./examples): Examples of integration with CFML, SLF, and Iris.

## Building the repo

The main branch works with Coq 8.20.1, as not all of the separation-logic libraries that we target have been ported to Rocq 9):

- Use `make init` to {OPAM,npm,pip} dependencies, then `make all` to build everything.
- Use `make serve` and browse to `localhost:8080` to view generated examples.

## Installing framework integrations

The framework-specific interoperability packages can be installed separately.

### `rocq-sepviz-iris`

For Coq versions 8.20.1 or later, but earlier than Rocq 9.0, with Iris 4.3.0 or later, install from the main branch:
```bash
opam pin add -n rocq-sepviz-iris.dev https://github.com/epfl-systemf/sepviz.git --subpath=interop/sepviz-iris
opam install rocq-sepviz-iris.dev
```

For Rocq 9.0.1 or later, install from the `rocq-9.0.1` branch:
```bash
opam pin add -n rocq-sepviz-iris.dev https://github.com/epfl-systemf/sepviz.git\#rocq-9.0.1 --subpath=interop/sepviz-iris
opam install rocq-sepviz-iris.dev
```

### `rocq-sepviz-cfml` and `rocq-sepviz-slf`

For Coq versions 8.20.1 or later, but earlier than Rocq 9.0, replace `<framework>` with either `cfml` or `slf`:
```bash
opam pin add -n rocq-sepviz-<framework>.dev https://github.com/epfl-systemf/sepviz.git --subpath=interop/sepviz-<framework>
opam install rocq-sepviz-<framework>.dev
```

## Reading about the code

- Guan, Y., Chiplunkar, S., Pit-Claudel, C. (2026). Automatic Heap-Memory Diagrams for Separation-Logic Proofs. In: Darulova, E., Lin, A.W., Rümmer, P. (eds) Computer Aided Verification. CAV 2026. Lecture Notes in Computer Science, vol 16683. Springer, Cham. [https://doi.org/10.1007/978-3-032-32526-6_12](https://doi.org/10.1007/978-3-032-32526-6_12)
