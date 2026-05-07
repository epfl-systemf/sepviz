# Sepviz examples

The following are demos of interactive literate proof scripts for separation-logic proofs covering different frameworks and data structures:

- Using [CFML](https://www.chargueraud.org/softs/cfml/): <a href="cfml/LiterateQueue.html">queues</a> (queue transfer) and <a href="cfml/LiterateTree.html">binary trees</a> (tree rotations)

- Using [Iris](https://iris-project.org/): <a href="iris/Queue.html">queues</a> (queue transfer, same proof as the CFML one) and <a href="iris/LinkedLists.html">linked lists</a> (adapted from the [Iris tutorial](https://github.com/logsem/iris-tutorial); uses iterated separating conjunction)

- Using the variant of CFML in [*Separation Logic Foundations*](https://softwarefoundations.cis.upenn.edu/slf-current/index.html), part of the Software Foundations textbook series: the <a href="slf/SLFExample.html">"Representation predicates" chapter</a> (lists, list segments, stacks; visualizing trees is left as an exercise for the reader).

```{raw} html
<div class="gallery">
  <img src="queue-transfer.gif" width="500px">
  <img src="tree-right-rotate.gif" width="300px">
</div>
```

References: [CFML](https://www.chargueraud.org/softs/cfml/), [Iris](https://iris-project.org/), [Separation Logic Foundations](https://softwarefoundations.cis.upenn.edu/slf-current/index.html)

```{raw} html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/IBM-type/0.5.4/css/ibm-type.min.css" integrity="sha512-sky5cf9Ts6FY1kstGOBHSybfKqdHR41M0Ldb0BjNiv3ifltoQIsg0zIaQ+wwdwgQ0w9vKFW7Js50lxH9vqNSSw==" crossorigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans&display=swap" rel="stylesheet">
<style>
  body {
      max-width: 900px;
      margin: 1em auto;
      font-family: 'Alegreya Sans', sans-serif;
      font-size: 1.4em;
      line-height: 1.4;
  }

  .gallery {
      display: flex;
      align-items: start;
      width: 100%;
      flex-wrap: wrap;
      justify-content: space-around;
      align-content: space-between;
      gap: 1em;
  }

  .gallery > * {
      min-width: 10em;
  }
</style>
```
