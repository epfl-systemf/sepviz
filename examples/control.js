// Use "Click" instead of "Meta/Ctrl + Click" to navigate.

function handleClick(evt) {
    const sentence = evt.currentTarget;
    [...sentence.getElementsByClassName("alectryon-toggle")].forEach(t => { t.checked = false; });
    Alectryon.slideshow.navigate(sentence.alectryon_index, true);
    evt.preventDefault();
}

window.addEventListener("load", () => {
    Alectryon.slideshow.sentences.forEach(s => {
    s.addEventListener("click", handleClick);
    });
});
