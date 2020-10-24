_build/%.html: cfml2/theories/%.v
	{ cd cfml2/; \
	  alectryon $$(cat _CoqProject) theories/$*.v --output-directory ../_build; }

_build/%: %
	ln -f $< $@

default: _build/LiterateQueue.html _build/sep.js _build/sep.css _build/parser.js;

test: default
	google-chrome _build/LiterateQueue.html
