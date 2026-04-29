DEMOS := SLFExample

ALECTRYON       ?= $(abspath ../.venv/bin/python) -m alectryon
ALECTRYON_FLAGS := --webpage-style windowed --long-line-threshold 0
COQ_FLAGS       := $(shell cat _CoqProject)

VO_FILES   := $(patsubst %.v,%.vo,$(wildcard *.v))
HTML_FILES := $(DEMOS:%=../_build/slf/%.html)
YAML_FILE  := ../_build/slf/sepviz.yaml

.PHONY: all coq html clean

all: coq html

coq:  $(VO_FILES)
html: $(HTML_FILES) $(YAML_FILE)

%.vo: %.v _CoqProject
	coqc $(COQ_FLAGS) $<

../_build/slf/%: % | ../_build/slf
	cp $< $@

../_build/slf/%.html: %.v %.vo | ../_build/slf
	$(ALECTRYON) $(COQ_FLAGS) $(ALECTRYON_FLAGS) -o $@ $<

../_build/slf:
	mkdir -p $@

clean:
	rm -f *.vo *.vok *.vos *.glob .*.aux

distclean: clean
