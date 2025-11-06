COQC=coqc
USE_NIX ?= false

ifeq ($(USE_NIX), false)
	COQFLAGS=-R . SepDiagram -Q vendor/cfml/lib/coq CFML -Q vendor/tlc/src TLC
else
	COQFLAGS=-R . SepDiagram
endif

BUILD_DIR := _build
LIB := lib
EXM := examples

VFILES_IN_LIB := WPUntyped.v Notations.v ListNull.v
VFILES_IN_EXM := LiterateQueue.v LiterateTree.v

LIB_VFILES := $(addprefix $(LIB)/, $(VFILES_IN_LIB))
HTML_FILES := $(addprefix $(BUILD_DIR)/, $(VFILES_IN_EXM:.v=.html))

.PHONY: default tlc cfml clean-web clean-coq clean test

default: $(HTML_FILES)

tlc:
	$(MAKE) -C vendor/tlc -j4

cfml: tlc
	$(MAKE) -C vendor/cfml .depend_lib
	$(MAKE) COQEXTRAFLAGS="-Q vendor/tlc/src TLC" -C vendor/cfml libcoq

%.vo: %.v
	$(COQC) $(COQFLAGS) $<

$(LIB)/Notations.vo: $(LIB)/WPUntyped.vo

$(LIB)/ListNull.vo: $(LIB)/Notations.vo

$(BUILD_DIR):
	mkdir -p $@

$(BUILD_DIR)/%.html: $(EXM)/%.v $(LIB_VFILES:.v=.vo)
	alectryon $(COQFLAGS) --output $@ $<

clean-web:
	rm -rf $(BUILD_DIR)

clean-coq:
	find . \( -name "*.vo" -o -name "*.vos" -o -name "*.vok" -o -name "*.glob" \) -delete

clean: clean-web clean-coq

test: default
	firefox $(BUILD_DIR)/LiterateQueue.html
	firefox $(BUILD_DIR)/LiterateTree.html
