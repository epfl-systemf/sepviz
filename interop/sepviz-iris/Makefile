COQ_LIB := $(shell coqc -where)
COQ_FLAGS := $(shell cat _CoqProject)

V_FILES := $(wildcard theories/*.v)
VO_FILES := $(V_FILES:.v=.vo)

.PHONY: init all install clean

all: init build

build: $(VO_FILES)

init:
	opam install --yes --deps-only .

theories/%.vo: theories/%.v _CoqProject
	coqc $(COQ_FLAGS) $<

install: build
	install -d $(DESTDIR)$(COQ_LIB)/user-contrib/Sepviz
	install -m 0644 theories/*.vo theories/*.glob theories/*.v \
	    $(DESTDIR)$(COQ_LIB)/user-contrib/Sepviz/

clean:
	find theories -type f \( -name '*.vo' -o -name '*.vok' -o -name '*.vos' -o -name '*.glob' -o -name '.*.aux' \) -delete

distclean: clean
