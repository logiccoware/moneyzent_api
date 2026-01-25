.PHONY: build-ApiFunction

build-ApiFunction:
	npm ci
	npm run build
	mkdir -p $(ARTIFACTS_DIR)/dist
	cp dist/bundle.mjs $(ARTIFACTS_DIR)/dist/bundle.mjs
	cp package.json $(ARTIFACTS_DIR)/
