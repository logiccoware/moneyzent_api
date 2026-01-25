.PHONY: build-ApiFunction

build-ApiFunction:
	npm ci
	npm run build
	cp dist/bundle.mjs $(ARTIFACTS_DIR)/dist/bundle.mjs
	cp package.json $(ARTIFACTS_DIR)/
