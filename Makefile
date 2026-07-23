ROOT := $(abspath $(dir $(firstword $(MAKEFILE_LIST))))
OCAMLC_VERSION := 5.4.0
OPAM_SWITCH := $(ROOT)
OPAM_EXEC := opam exec --switch="$(OPAM_SWITCH)" --
SUBDIRS := interop/sepviz-iris interop/sepviz-cfml interop/sepviz-slf \
           sepviz sepviz-alectryon sepviz-vsrocq \
           examples

.NOTPARALLEL:

.PHONY: prepare init all clean $(SUBDIRS:%=init-%) $(SUBDIRS:%=all-%) $(SUBDIRS:%=clean-%) $(SUBDIRS:%=distclean-%)

init: prepare $(SUBDIRS:%=init-%)

prepare:
	@if [ ! -d $(ROOT)/_opam ]; then \
		opam switch create $(ROOT) $(OCAMLC_VERSION) --no-install; \
		echo "Local opam switch created at $(ROOT)."; \
	else \
		echo "Local opam switch already exists at $(ROOT); Reusing."; \
	fi
	@if ! opam repository list --switch=$(ROOT) --short | grep -Fxq coq-released; then \
		opam repository add --switch=$(ROOT) coq-released https://coq.inria.fr/opam/released; \
	fi

all:  $(SUBDIRS:%=all-%)
clean: $(SUBDIRS:%=clean-%)
distclean: $(SUBDIRS:%=distclean-%)

$(SUBDIRS:%=init-%):      init-%:      ; +$(OPAM_EXEC) $(MAKE) -C "$(ROOT)/$*" init
$(SUBDIRS:%=all-%):       all-%:       ; +$(OPAM_EXEC) $(MAKE) -C "$(ROOT)/$*" all
$(SUBDIRS:%=clean-%):     clean-%:     ; +$(OPAM_EXEC) $(MAKE) -C "$(ROOT)/$*" clean
$(SUBDIRS:%=distclean-%): distclean-%: ; +$(OPAM_EXEC) $(MAKE) -C "$(ROOT)/$*" distclean

serve-examples:
	+$(OPAM_EXEC) $(MAKE) -C examples serve
