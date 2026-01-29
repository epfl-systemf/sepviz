document.addEventListener('DOMContentLoaded', init);

function init() {
  const renderBtn = document.getElementById('renderBtn');
  const animateBtn = document.getElementById('animateBtn');
  const animateHost = document.getElementById('display');
  const prevDotElem = document.getElementById('prevDot');
  const currDotElem = document.getElementById('currDot');
  const prevSvgElem = document.getElementById('prevSvg');
  const currSvgElem = document.getElementById('currSvg');

  // See: https://github.com/magjac/d3-graphviz?tab=readme-ov-file#graphviz_keyMode
  // Use 'keyMode: id' to ensure that d3-graphviz treats nodes/edges of the
  // same id as the same object in transitions.
  const graphvizOptions = {
    fit: false,
    zoom: true,
    keyMode: 'id',
    useWorker: false,
  };

  renderBtn?.addEventListener('click', async () => {
    const prevDot = prevDotElem.value.trim();
    const currDot = currDotElem.value.trim();
    d3.select(prevSvgElem).graphviz(graphvizOptions).renderDot(prevDot);
    d3.select(currSvgElem).graphviz(graphvizOptions).renderDot(currDot);
  });
  animateBtn?.addEventListener('click', async () => {
    const prevDot = prevDotElem.value.trim();
    const currDot = currDotElem.value.trim();
    const gviz = d3.select(animateHost).graphviz(graphvizOptions);

    await new Promise((resolve) => {
      gviz.renderDot(prevDot).on('end', resolve);
    });

    gviz
      .transition(() => d3.transition().duration(2000).ease(d3.easeCubicInOut))
      .dot(currDot);

    await new Promise((resolve) => {
      gviz.render().on('end', resolve);
    });
  });
}
