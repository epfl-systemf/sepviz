# _build/%.html: cfml2/theories/%.v
# 	{ cd cfml2/; \
# 	  alectryon $$(cat _CoqProject) theories/$*.v --output-directory ../_build; }

_build/%.html: theories/examples/%.v
	{ cd theories/; \
	  alectryon $$(cat _CoqProject) --output-directory ../_build; }

_build/%: assets/%
	ln -f $< $@

default: _build/LiterateQueue.html _build/sep.js _build/sep.css _build/parser.js;

test: default
	firefox _build/LiterateQueue.html

clean:
	rm -f _build/*
