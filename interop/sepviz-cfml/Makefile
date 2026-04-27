COQ_LIB := $(shell coqc -where)
COQ_FLAGS := $(shell cat _CoqProject)

V_FILES := $(wildcard theories/*.v)
VO_FILES := $(V_FILES:.v=.vo)

.PHONY: init all install clean vendor

init:
	opam install --yes --deps-only .

all: vendor $(VO_FILES)

vendor:
	+$(MAKE) -C vendor/tlc
	+$(MAKE) -C vendor/cfml .depend_lib
	+$(MAKE) -C vendor/cfml libcoq COQEXTRAFLAGS="-Q ../tlc/src TLC"

$(VO_FILES): | vendor

theories/%.vo: theories/%.v _CoqProject
	coqc $(COQ_FLAGS) $<

install: all
	install -d $(DESTDIR)$(COQ_LIB)/user-contrib/Sepviz
	install -m 0644 theories/*.vo theories/*.glob theories/*.v \
	    $(DESTDIR)$(COQ_LIB)/user-contrib/Sepviz/

clean:
	find theories -type f \( -name '*.vo' -o -name '*.vok' -o -name '*.vos' -o -name '*.glob' -o -name '.*.aux' \) -delete
	-+$(MAKE) -C vendor/cfml clean
	-+$(MAKE) -C vendor/tlc clean
