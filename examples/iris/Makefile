DEMOS := Queue LinkedLists

ALECTRYON       ?= $(abspath ../.venv/bin/python) -m alectryon
ALECTRYON_FLAGS := --webpage-style windowed --long-line-threshold 0
COQ_FLAGS       := $(shell cat _CoqProject)

VO_FILES   := $(patsubst %.v,%.vo,$(wildcard *.v))
HTML_FILES := $(DEMOS:%=../_build/iris/%.html)

.PHONY: all coq html clean

all: coq html

coq:  $(VO_FILES)
html: $(HTML_FILES)

%.vo: %.v _CoqProject
	coqc $(COQ_FLAGS) $<

../_build/iris/%.html: %.v %.vo ../sepviz.yaml | ../_build/iris
	$(ALECTRYON) $(COQ_FLAGS) $(ALECTRYON_FLAGS) -o $@ $<

../_build/iris:
	mkdir -p $@

clean:
	rm -f *.vo *.vok *.vos *.glob .*.aux
