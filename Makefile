SHELL := /bin/bash

all: install

install: aws_cli aws_sam_cli pulumi uv

aws_cli:
	curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
	unzip awscliv2.zip

	rm -rf ~/.aws-cli
	./aws/install -i ~/.aws-cli -b ~/.local/bin

	rm -f awscliv2.zip
	rm -rf aws

aws_sam_cli:
	curl -sL https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip -o aws-sam-cli-linux-x86_64.zip
	unzip aws-sam-cli-linux-x86_64.zip -d sam-installation

	rm -rf ~/.aws-sam-cli
	./sam-installation/install -i ~/.aws-sam-cli -b ~/.local/bin

	rm -f aws-sam-cli-linux-x86_64.zip
	rm -rf sam-installation

pulumi:
	curl -fsSL https://get.pulumi.com | sh

uv:
	curl -LsSf https://astral.sh/uv/install.sh | sh

sam:
	@status=0; \
	$(MAKE) localstack-up || status=$$?; \
	if [ $$status -eq 0 ]; then $(MAKE) localstack-wait || status=$$?; fi; \
	if [ $$status -eq 0 ]; then $(MAKE) localstack-bootstrap || status=$$?; fi; \
	if [ $$status -eq 0 ]; then $(MAKE) sam-env || status=$$?; fi; \
	if [ $$status -eq 0 ]; then $(MAKE) sam-build || status=$$?; fi; \
	if [ $$status -eq 0 ]; then $(MAKE) sam-invoke-all || status=$$?; fi; \
	$(MAKE) localstack-down; \
	exit $$status

sam-invoke-all:
	@set -euo pipefail; \
	mkdir -p tmp; \
	python scripts/localstack/make_event.py --path /api/v1/recommend --method GET > tmp/event.recommend.json; \
	sam local invoke RecommendFunction -t .aws-sam/build/template.yaml -e tmp/event.recommend.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json; \
	TOKEN="$$(bash scripts/localstack/get_token.sh)"; \
	python scripts/localstack/make_event.py --path /api/v1/history --method GET --token "$$TOKEN" > tmp/event.history.json; \
	sam local invoke HistoryFunction -t .aws-sam/build/template.yaml -e tmp/event.history.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json; \
	python scripts/localstack/make_event.py --path /api/v1/preferences --method GET --token "$$TOKEN" > tmp/event.preferences.json; \
	sam local invoke PreferencesFunction -t .aws-sam/build/template.yaml -e tmp/event.preferences.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json; \
	python scripts/localstack/make_event.py --path /api/v1/watch-later --method GET --token "$$TOKEN" > tmp/event.watch-later.json; \
	sam local invoke WatchLaterFunction -t .aws-sam/build/template.yaml -e tmp/event.watch-later.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json

localstack-up:
	@docker network inspect sam-local >/dev/null 2>&1 || docker network create sam-local >/dev/null
	docker compose up -d

localstack-wait:
	@echo "Waiting for LocalStack health..." \
	; for i in $$(seq 1 60); do \
	  python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:4566/_localstack/health').read()" >/dev/null 2>&1 && exit 0; \
	  sleep 1; \
	done; \
	echo "LocalStack did not become healthy"; \
	exit 1

localstack-bootstrap:
	@echo "Bootstrapping LocalStack resources (DynamoDB + Cognito)..."
	@chmod +x scripts/localstack/get_token.sh scripts/localstack/init/ready.d/*.sh
	@docker compose exec -T localstack bash /etc/localstack/init/ready.d/01-dynamodb.sh
	@docker compose exec -T localstack bash /etc/localstack/init/ready.d/02-cognito.sh

localstack-down:
	docker compose down

sam-env:
	@mkdir -p tmp
	@rm -f tmp/sam-env.json
	python scripts/localstack/gen_sam_env.py

sam-api:
	$(MAKE) localstack-up
	$(MAKE) localstack-wait
	$(MAKE) localstack-bootstrap
	$(MAKE) sam-env
	$(MAKE) sam-build
	sam local start-api -t .aws-sam/build/template.yaml --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json

sam-build:
	@mkdir -p .aws-sam
	sam build -t template.yaml --use-container

sam-invoke-recommend:
	@set -euo pipefail; \
	TOKEN="$$(bash scripts/localstack/get_token.sh)"; \
	mkdir -p tmp; \
	python scripts/localstack/make_event.py --path /api/v1/recommend --method GET --token "$$TOKEN" > tmp/event.json; \
	sam local invoke RecommendFunction -t .aws-sam/build/template.yaml -e tmp/event.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json

sam-invoke-history:
	@set -euo pipefail; \
	TOKEN="$$(bash scripts/localstack/get_token.sh)"; \
	mkdir -p tmp; \
	python scripts/localstack/make_event.py --path /api/v1/history --method GET --token "$$TOKEN" > tmp/event.json; \
	sam local invoke HistoryFunction -t .aws-sam/build/template.yaml -e tmp/event.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json

sam-invoke-preferences-get:
	@set -euo pipefail; \
	TOKEN="$$(bash scripts/localstack/get_token.sh)"; \
	mkdir -p tmp; \
	python scripts/localstack/make_event.py --path /api/v1/preferences --method GET --token "$$TOKEN" > tmp/event.json; \
	sam local invoke PreferencesFunction -t .aws-sam/build/template.yaml -e tmp/event.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json

sam-invoke-preferences-post:
	@set -euo pipefail; \
	TOKEN="$$(bash scripts/localstack/get_token.sh)"; \
	mkdir -p tmp; \
	python scripts/localstack/make_event.py --path /api/v1/preferences --method POST --token "$$TOKEN" --body '{"genres":["sci-fi"],"subscriptions":["Netflix"],"age-rating":"16","humor":"calmo"}' > tmp/event.json; \
	sam local invoke PreferencesFunction -t .aws-sam/build/template.yaml -e tmp/event.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json

sam-invoke-watch-later-get:
	@set -euo pipefail; \
	TOKEN="$$(bash scripts/localstack/get_token.sh)"; \
	mkdir -p tmp; \
	python scripts/localstack/make_event.py --path /api/v1/watch-later --method GET --token "$$TOKEN" > tmp/event.json; \
	sam local invoke WatchLaterFunction -t .aws-sam/build/template.yaml -e tmp/event.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json

sam-invoke-watch-later-post:
	@set -euo pipefail; \
	TOKEN="$$(bash scripts/localstack/get_token.sh)"; \
	mkdir -p tmp; \
	python scripts/localstack/make_event.py --path /api/v1/watch-later --method POST --token "$$TOKEN" --body '{"movieId":"tt0133093"}' > tmp/event.json; \
	sam local invoke WatchLaterFunction -t .aws-sam/build/template.yaml -e tmp/event.json --docker-network sam-local --mount-symlinks --env-vars tmp/sam-env.json
