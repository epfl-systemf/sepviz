DEMOS := Original Rendered

ALECTRYON       ?= $(abspath ../.venv/bin/python) -m alectryon
ALECTRYON_FLAGS := --webpage-style windowed --long-line-threshold 0
COQ_FLAGS       := $(shell cat _CoqProject)

VO_FILES   := $(patsubst %.v,%.vo,$(wildcard *.v))
HTML_FILES := $(DEMOS:%=../_build/talk-demo/%.html)
YAML_FILE  := ../_build/talk-demo/sepviz.yaml

BUILD_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))/../_build

.PHONY: all coq html clean

all: coq html

coq:  $(VO_FILES)
html: $(HTML_FILES) $(YAML_FILE)

%.vo: %.v _CoqProject
	coqc $(COQ_FLAGS) $<

Original.vo: Shared.vo
Rendered.vo: Shared.vo

../_build/talk-demo/%: % | ../_build/talk-demo
	cp $< $@

../_build/talk-demo/%.html: %.v %.vo | ../_build/talk-demo
	$(ALECTRYON) $(COQ_FLAGS) $(ALECTRYON_FLAGS) -o $@ $<

../_build/talk-demo:
	mkdir -p $@

serve:
	python3 -m http.server --directory $(BUILD_DIR)

clean:
	rm -f *.vo *.vok *.vos *.glob .*.aux

distclean: clean
