SUBDIRS := interop/sepviz-iris interop/sepviz-cfml interop/sepviz-slf \
           sepviz sepviz-alectryon sepviz-vsrocq \
           examples

.NOTPARALLEL:

.PHONY: init all clean $(SUBDIRS:%=init-%) $(SUBDIRS:%=all-%) $(SUBDIRS:%=clean-%) $(SUBDIRS:%=distclean-%)

init: $(SUBDIRS:%=init-%)
all:  $(SUBDIRS:%=all-%)
clean: $(SUBDIRS:%=clean-%)
distclean: $(SUBDIRS:%=distclean-%)

$(SUBDIRS:%=init-%):      init-%:      ; +$(MAKE) -C $* init
$(SUBDIRS:%=all-%):       all-%:       ; +$(MAKE) -C $* all
$(SUBDIRS:%=clean-%):     clean-%:     ; +$(MAKE) -C $* clean
$(SUBDIRS:%=distclean-%): distclean-%: ; +$(MAKE) -C $* distclean

serve-examples:
	+$(MAKE) -C examples serve
