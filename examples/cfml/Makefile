DEMOS := LiterateQueue LiterateTree LiterateList

ALECTRYON       ?= $(abspath ../.venv/bin/python) -m alectryon
ALECTRYON_FLAGS := --webpage-style windowed --long-line-threshold 0
COQ_FLAGS       := $(shell cat _CoqProject)

VO_FILES   := $(patsubst %.v,%.vo,$(wildcard *.v))
HTML_FILES := $(DEMOS:%=../_build/cfml/%.html)
YAML_FILE  := ../_build/cfml/sepviz.yaml

.PHONY: all coq html clean

all: coq html

coq:  $(VO_FILES)
html: $(HTML_FILES) $(YAML_FILE)

%.vo: %.v _CoqProject
	coqc $(COQ_FLAGS) $<

LiterateQueue.vo: ListNull.vo

../_build/cfml/%: % | ../_build/cfml
	cp $< $@

../_build/cfml/%.html: %.v %.vo | ../_build/cfml
	$(ALECTRYON) $(COQ_FLAGS) $(ALECTRYON_FLAGS) -o $@ $<

../_build/cfml:
	mkdir -p $@

clean:
	rm -f *.vo *.vok *.vos *.glob .*.aux

distclean: clean
