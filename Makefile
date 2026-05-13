SUBDIRS := interop/sepviz-iris interop/sepviz-cfml interop/sepviz-slf \
           sepviz sepviz-alectryon sepviz-vsrocq \
           examples

.NOTPARALLEL:

.PHONY: prepare init all clean $(SUBDIRS:%=init-%) $(SUBDIRS:%=all-%) $(SUBDIRS:%=clean-%) $(SUBDIRS:%=distclean-%)

init: prepare $(SUBDIRS:%=init-%)

prepare:
	@if ! opam switch list --short | grep -qx coq-8.20; then \
		opam switch create coq-8.20 5.4.0; \
	fi
	@eval $$(opam env --switch=coq-8.20) && \
	if ! opam repo list --short | grep -qx coq-released; then \
		opam repo add coq-released https://coq.inria.fr/opam/released; \
	fi
	@eval $$(opam env --switch=coq-8.20)

all:  $(SUBDIRS:%=all-%)
clean: $(SUBDIRS:%=clean-%)
distclean: $(SUBDIRS:%=distclean-%)

$(SUBDIRS:%=init-%):      init-%:      ; +$(MAKE) -C $* init
$(SUBDIRS:%=all-%):       all-%:       ; +$(MAKE) -C $* all
$(SUBDIRS:%=clean-%):     clean-%:     ; +$(MAKE) -C $* clean
$(SUBDIRS:%=distclean-%): distclean-%: ; +$(MAKE) -C $* distclean

serve-examples:
	+$(MAKE) -C examples serve
