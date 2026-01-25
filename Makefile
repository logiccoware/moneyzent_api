# SAM Build Makefile for NestJS Lambda deployment

.PHONY: build-ApiFunction

# SAM invokes this target when building the Lambda function
build-ApiFunction:
	npm ci --omit=dev
	npm run build
	cp -r dist $(ARTIFACTS_DIR)/
	cp -r node_modules $(ARTIFACTS_DIR)/
	cp package.json $(ARTIFACTS_DIR)/
