SHELL := /bin/bash

.PHONY: help install dev build start lint clean

help:
	@echo "Comandos disponíveis:"
	@echo "  make install  - Instala dependências"
	@echo "  make dev      - Inicia o frontend em modo desenvolvimento (porta 3001)"
	@echo "  make build    - Gera build de produção"
	@echo "  make start    - Inicia frontend em modo produção (porta 3001)"
	@echo "  make lint     - Executa lint"
	@echo "  make clean    - Remove pasta .next"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

clean:
	rm -rf .next