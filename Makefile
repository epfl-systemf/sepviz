COQC=coqc
USE_NIX ?= false

ifeq ($(USE_NIX), false)
	COQFLAGS=-R theories SepDiagram -Q vendor/cfml/lib/coq CFML -Q vendor/tlc/src TLC
else
	COQFLAGS=-R theories SepDiagram
endif

BUILD_DIR := _build
LIB := theories/lib
EXM := theories/examples

VFILES_IN_LIB := WPUntyped.v Notations.v ListNull.v
VFILES_IN_EXM := LiterateQueue.v LiterateTree.v

LIB_VFILES := $(addprefix $(LIB)/, $(VFILES_IN_LIB))
HTML_FILES := $(addprefix $(BUILD_DIR)/, $(VFILES_IN_EXM:.v=.html))

JS_FILES := newsep.js parser.js

.PHONY: default prepare tlc install-tlc cfml install-cfml clean-web clean

default: $(HTML_FILES) $(addprefix $(BUILD_DIR)/, $(JS_FILES)) $(BUILD_DIR)/sep.css $(BUILD_DIR)/render_config.yml
prepare: install-cfml

tlc:
	$(MAKE) -C vendor/tlc -j4

install-tlc: tlc
	mkdir -p $(shell coqc -where)/user-contrib/TLC
	cp vendor/tlc/src/*.vo vendor/tlc/src/*.v $(shell coqc -where)/user-contrib/TLC/

cfml: install-tlc
	$(MAKE) -C vendor/cfml .depend_lib
	$(MAKE) -C vendor/cfml libcoq

install-cfml: cfml
	mkdir -p $(shell coqc -where)/user-contrib/CFML
	cp vendor/cfml/lib/coq/*.vo vendor/cfml/lib/coq/*.v $(shell coqc -where)/user-contrib/CFML/

%.vo: %.v
	$(COQC) $(COQFLAGS) $<

$(LIB)/Notations.vo: $(LIB)/WPUntyped.vo

$(LIB)/ListNull.vo: $(LIB)/Notations.vo

$(BUILD_DIR):
	mkdir -p $@

$(BUILD_DIR)/%.html: theories/examples/%.v $(LIB_VFILES:.v=.vo)
	alectryon $(COQFLAGS) $< --output-directory $(BUILD_DIR)

$(BUILD_DIR)/%: assets/% $(BUILD_DIR)
	cp $< $@

$(BUILD_DIR)/parser.js: assets/sep.g $(BUILD_DIR)
	npx peggy --format es -o $@ $<

test: default
	firefox $(BUILD_DIR)/LiterateQueue.html
	firefox $(BUILD_DIR)/LiterateTree.html

clean-prepare:
	$(MAKE) -C vendor/cfml clean || true
	$(MAKE) -C vendor/tlc clean || true

clean-web:
	rm -rf $(BUILD_DIR)

clean: clean-web
	find theories \( -name "*.vo" -o -name "*.vos" -o -name "*.vok" -o -name "*.glob" \) -delete
