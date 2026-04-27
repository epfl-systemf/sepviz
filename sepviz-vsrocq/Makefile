.PHONY: init all clean

init:
	cd vendor/vsrocq/client && yarn install && yarn run install:all

all:
	cd vendor/vsrocq/client && yarn run package
	cd vendor/vsrocq/client && ./node_modules/vsce/vsce package

clean:
	rm -rf vendor/vsrocq/client/dist vendor/vsrocq/client/*.vsix
	find vendor/vsrocq/client -name node_modules -type d -prune -exec rm -rf {} +
