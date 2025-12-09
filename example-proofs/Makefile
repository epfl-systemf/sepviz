COQC=coqc
USE_NIX ?= false
OUT_DIR ?= _build

ifeq ($(USE_NIX), false)
	COQFLAGS=-R theories SepDiagram -Q vendor/cfml/lib/coq CFML -Q vendor/tlc/src TLC
else
	COQFLAGS=-R theories SepDiagram
endif

LIB := theories/lib
EXM := theories/examples

VFILES_IN_LIB := WPUntyped.v Notations.v ListNull.v
VFILES_IN_EXM := LiterateQueue.v LiterateTree.v LiterateTest.v

LIB_VFILES := $(addprefix $(LIB)/, $(VFILES_IN_LIB))
HTML_FILES := $(addprefix $(OUT_DIR)/, $(VFILES_IN_EXM:.v=.html))

.PHONY: default tlc cfml clean-web clean-theories clean test

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

$(OUT_DIR):
	mkdir -p $@

$(OUT_DIR)/%.html: $(EXM)/%.v $(LIB_VFILES:.v=.vo)
	alectryon $(COQFLAGS) --output $@ $<

clean-web:
	rm -rf $(OUT_DIR)

clean-theories:
	find theories \( -name "*.vo" -o -name "*.vos" -o -name "*.vok" -o -name "*.glob" \) -delete

clean: clean-web clean-theories

test: default
	firefox $(OUT_DIR)/LiterateQueue.html
	firefox $(OUT_DIR)/LiterateTree.html
