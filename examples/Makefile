PYTHON         := $(abspath .venv/bin/python)
ALECTRYON      := $(PYTHON) -m alectryon
EXAMPLES       := iris cfml slf
ALECTRYON_DIST := sepviz-alectryon.js sepviz-alectryon.css
GIFS           := queue-transfer.gif tree-right-rotate.gif

.PHONY: init all serve clean distclean $(EXAMPLES:%=all-%) $(EXAMPLES:%=clean-%)

init: .venv
	opam install --yes vsrocq-language-server

.venv:
	python3 -m venv .venv
	$(PYTHON) -m pip install pyyaml alectryon==2.0.0

all: $(EXAMPLES:%=all-%) $(addprefix _build/,$(ALECTRYON_DIST)) _build/index.html $(addprefix _build/,$(GIFS))

$(EXAMPLES:%=all-%):   all-%:   ; +$(MAKE) -C $* all
$(EXAMPLES:%=clean-%): clean-%: ; +$(MAKE) -C $* clean

_build:
	mkdir -p $@

$(addprefix _build/,$(ALECTRYON_DIST)): _build/%: ../sepviz-alectryon/dist/% | _build
	cp $< $@

$(addprefix _build/,$(GIFS)): _build/%: gifs/% | _build
	cp $< $@

_build/index.html: README.md | _build
	$(ALECTRYON) --frontend md --backend webpage --no-header --webpage-style centered $< -o $@

serve:
	cd _build && python3 -m http.server

clean: $(EXAMPLES:%=clean-%)
	rm -rf _build

distclean: clean
	rm -rf .venv
