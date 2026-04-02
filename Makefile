SHELL := /bin/bash

COMPOSE_FILE := apps/backend/docker-compose.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)
FRONTEND_DIR := apps/frontend
TLS_SCRIPT := apps/backend/scripts/generate-backend-tls.sh
TLS_DIR := apps/backend/secrets/tls
TLS_FILES := $(TLS_DIR)/ca.crt $(TLS_DIR)/backend.crt $(TLS_DIR)/backend.key

RESET_DB ?= 0
REBUILD ?= 1
DETACH ?= 1
SYNC_FRONTEND ?= 1
TLS_REGENERATE ?= 0

UP_FLAGS :=

ifeq ($(REBUILD),1)
UP_FLAGS += --build
endif

ifeq ($(DETACH),1)
UP_FLAGS += -d
endif

.DEFAULT_GOAL := up

.PHONY: up sync-frontend tls-certs down restart reset-db logs ps stop status help

help:
	@echo "Comandos disponíveis:"
	@echo "  make            - Sobe o frontend e o backend"
	@echo "  make up         - Sobe o stack completo"
	@echo "  make reset-db   - Derruba volumes do backend e sobe tudo novamente"
	@echo "  make down       - Derruba o stack"
	@echo "  make restart    - Reinicia o stack"
	@echo "  make logs       - Mostra logs do stack"
	@echo "  make ps         - Lista containers do stack"
	@echo "  make tls-certs  - Gera certificados TLS do backend (quando faltarem)"
	@echo "  make sync-frontend - Sincroniza package-lock do frontend"
	@echo "Flags: RESET_DB=1 REBUILD=0 DETACH=0 SYNC_FRONTEND=0 TLS_REGENERATE=1"

sync-frontend:
	@if [ "$(SYNC_FRONTEND)" = "1" ]; then \
		cd $(FRONTEND_DIR) && npm install; \
	fi

tls-certs:
	@if [ "$(TLS_REGENERATE)" = "1" ]; then \
		echo "Forcando regeneracao de certificados TLS..."; \
		bash $(TLS_SCRIPT); \
	else \
		missing=0; \
		for cert in $(TLS_FILES); do \
			[ -f "$$cert" ] || missing=1; \
		done; \
		if [ "$$missing" = "1" ]; then \
		echo "Certificados TLS nao encontrados. Gerando..."; \
		bash $(TLS_SCRIPT); \
		else \
		echo "Certificados TLS ja existem. Pulando geracao."; \
		fi; \
	fi

up: sync-frontend tls-certs
	@if [ "$(RESET_DB)" = "1" ]; then \
		$(COMPOSE) down -v --remove-orphans; \
	fi
	$(COMPOSE) up $(UP_FLAGS)

reset-db:
	$(MAKE) up RESET_DB=1

down:
	$(COMPOSE) down --remove-orphans

stop:
	$(COMPOSE) stop

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f --tail=200

ps:
	$(COMPOSE) ps

status: ps