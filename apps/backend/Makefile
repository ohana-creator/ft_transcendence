# ============================================
# FT_TRANSCENDENCE - Makefile
# ============================================
# Comandos para gerenciar o projeto facilmente
# Uso: make <comando>
# ============================================

.PHONY: help up down restart logs clean clean-all db-up db-down db-reset nuclear \
        status build rebuild migrate push-schema \
        logs-api logs-auth logs-user logs-campaign logs-ledger logs-wallet logs-notification \
        shell-api shell-auth shell-user shell-campaign shell-ledger shell-wallet shell-notification \
	test health dev prod tls-certs

# Cores para output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
BLUE   := \033[0;34m
NC     := \033[0m # No Color

# Configurações
COMPOSE := docker compose
COMPOSE_DEV := docker compose -f docker-compose.dev.yml

# ============================================
# AJUDA
# ============================================

help: ## Mostra esta ajuda
	@echo ""
	@echo "$(BLUE)╔════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║           FT_TRANSCENDENCE - COMANDOS DISPONÍVEIS          ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)🚀 COMANDOS PRINCIPAIS:$(NC)"
	@echo "  make up              - Inicia todos os serviços"
	@echo "  make down            - Para todos os serviços"
	@echo "  make restart         - Reinicia todos os serviços"
	@echo "  make status          - Mostra status dos containers"
	@echo "  make health          - Verifica saúde da API"
	@echo ""
	@echo "$(GREEN)🗄️  BANCO DE DADOS:$(NC)"
	@echo "  make db-up           - Inicia apenas os bancos de dados"
	@echo "  make db-down         - Para apenas os bancos de dados"
	@echo "  make db-reset        - Limpa e reinicia todos os bancos"
	@echo "  make push-schema     - Aplica schemas Prisma (db push)"
	@echo "  make migrate         - Executa migrações Prisma"
	@echo ""
	@echo "$(GREEN)🧹 LIMPEZA:$(NC)"
	@echo "  make clean           - Para containers e remove volumes"
	@echo "  make clean-all       - Limpeza completa (containers, volumes, imagens)"
	@echo "  make reset           - 💥 RESET TOTAL (apaga tudo e reconstrói)"
	@echo "  make nuclear         - ☢️  NUCLEAR (reset + limpa cache Node/Docker)"
	@echo ""
	@echo "$(GREEN)🔨 BUILD:$(NC)"
	@echo "  make build           - Builda todas as imagens"
	@echo "  make rebuild         - Rebuild forçado (sem cache)"
	@echo ""
	@echo "$(GREEN)📋 LOGS:$(NC)"
	@echo "  make logs            - Logs de todos os serviços"
	@echo "  make logs-api        - Logs do API Gateway"
	@echo "  make logs-auth       - Logs do Auth Service"
	@echo "  make logs-user       - Logs do User Service"
	@echo "  make logs-campaign   - Logs do Campaign Service"
	@echo "  make logs-ledger     - Logs do Ledger Service"
	@echo "  make logs-wallet     - Logs do Wallet Service"
	@echo "  make logs-notification - Logs do Notification Service"
	@echo ""
	@echo "$(GREEN)🐚 SHELL (acesso ao container):$(NC)"
	@echo "  make shell-api       - Shell no API Gateway"
	@echo "  make shell-campaign  - Shell no Campaign Service"
	@echo "  make shell-auth      - Shell no Auth Service"
	@echo "  (etc...)"
	@echo ""
	@echo "$(GREEN)🔧 DESENVOLVIMENTO:$(NC)"
	@echo "  make dev             - Inicia em modo desenvolvimento"
	@echo "  make prod            - Inicia em modo produção"
	@echo "  make tls-certs       - Gera certificados TLS locais do backend"
	@echo ""

# ============================================
# COMANDOS PRINCIPAIS
# ============================================

up: ## Inicia todos os serviços
	@echo "$(GREEN)🚀 Iniciando todos os serviços...$(NC)"
	@$(COMPOSE) up -d
	@echo "$(GREEN)✅ Serviços iniciados!$(NC)"
	@echo "$(YELLOW)⏱️  Aguarde ~30s para todos os serviços ficarem prontos$(NC)"
	@make status

down: ## Para todos os serviços
	@echo "$(YELLOW)🛑 Parando todos os serviços...$(NC)"
	@$(COMPOSE) down
	@echo "$(GREEN)✅ Serviços parados!$(NC)"

restart: ## Reinicia todos os serviços
	@echo "$(YELLOW)🔄 Reiniciando todos os serviços...$(NC)"
	@$(COMPOSE) restart
	@echo "$(GREEN)✅ Serviços reiniciados!$(NC)"

status: ## Mostra status dos containers
	@echo "$(BLUE)📊 Status dos containers:$(NC)"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20

health: ## Verifica saúde da API
	@echo "$(BLUE)🏥 Verificando saúde dos serviços...$(NC)"
	@echo ""
	@echo "API Gateway (3000):"
	@curl -sk https://localhost:3000/health | head -c 100 || echo "❌ Não responde"
	@echo ""

tls-certs: ## Gera certificados TLS locais para os serviços backend
	@echo "$(GREEN)🔐 Gerando certificados TLS locais...$(NC)"
	@./scripts/generate-backend-tls.sh
	@echo "$(GREEN)✅ Certificados gerados em secrets/tls$(NC)"

# ============================================
# BANCO DE DADOS
# ============================================

db-up: ## Inicia apenas os bancos de dados
	@echo "$(GREEN)🗄️  Iniciando bancos de dados...$(NC)"
	@$(COMPOSE) up -d redis authDb userDb campaignDb ledgerDb walletDb notificationDb
	@echo "$(YELLOW)⏱️  Aguardando bancos ficarem healthy...$(NC)"
	@sleep 10
	@make db-status

db-down: ## Para apenas os bancos de dados
	@echo "$(YELLOW)🛑 Parando bancos de dados...$(NC)"
	@$(COMPOSE) stop redis authDb userDb campaignDb ledgerDb walletDb notificationDb

db-status: ## Status dos bancos de dados
	@echo "$(BLUE)🗄️  Status dos bancos:$(NC)"
	@docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(Db|redis)" || echo "Nenhum banco rodando"

db-reset: ## 💥 RESET TOTAL - apaga TUDO (containers, volumes, imagens, cache)
	@echo "$(RED)💥 ATENÇÃO: RESET TOTAL - Isso vai APAGAR ABSOLUTAMENTE TUDO!$(NC)"
	@echo "$(RED)   - Todos os containers$(NC)"
	@echo "$(RED)   - Todos os volumes e dados$(NC)"  
	@echo "$(RED)   - Todas as imagens do projeto$(NC)"
	@echo "$(RED)   - Cache do Docker$(NC)"
	@echo ""
	@echo "$(YELLOW)Aguarde 5 segundos para cancelar (Ctrl+C)...$(NC)"
	@sleep 5
	@echo ""
	@echo "$(RED)🛑 Parando TODOS os containers...$(NC)"
	@$(COMPOSE) down --remove-orphans
	@echo "$(RED)🗑️  Removendo TODOS os containers do projeto...$(NC)"
	@docker container prune -f
	@echo "$(RED)📁 Removendo TODOS os volumes (dados perdidos para sempre)...$(NC)"
	@$(COMPOSE) down -v --remove-orphans
	@docker volume ls -q | grep -E "(ft-transcendence|auth|user|campaign|ledger|wallet|notification|redis)" | xargs -r docker volume rm -f 2>/dev/null || true
	@docker volume prune -f
	@echo "$(RED)🖼️  Removendo imagens do projeto...$(NC)"
	@docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | grep -E "(auth-service|user-service|campaign-service|ledger-service|wallet-service|notification-service|api-gateway)" | awk '{print $$2}' | xargs -r docker rmi -f 2>/dev/null || true
	@echo "$(RED)🧹 Limpando cache do Docker...$(NC)"
	@docker system prune -f
	@echo ""
	@echo "$(GREEN)✨ Reconstruindo TUDO do zero...$(NC)"
	@echo "$(YELLOW)1. Subindo bancos de dados limpos...$(NC)"
	@$(COMPOSE) up -d redis authDb userDb campaignDb ledgerDb walletDb notificationDb --build
	@echo "$(YELLOW)2. Aguardando bancos ficarem healthy (20s)...$(NC)"
	@sleep 20
	@echo "$(YELLOW)3. Buildando e iniciando TODOS os serviços...$(NC)"
	@$(COMPOSE) up -d --build
	@echo "$(YELLOW)4. Aguardando serviços iniciarem (30s)...$(NC)"
	@sleep 30
	@echo ""
	@echo "$(GREEN)✅ 💥 RESET TOTAL COMPLETO! 💥$(NC)"
	@echo "$(GREEN)   🎉 Sistema completamente limpo e reconstruído!$(NC)"
	@echo "$(GREEN)   🗄️  Bancos vazios e schemas aplicados$(NC)"
	@echo "$(GREEN)   🚀 Todos os serviços rodando com código atualizado$(NC)"
	@echo ""
	@make status

push-schema: ## Aplica schemas Prisma em todos os serviços (db push)
	@echo "$(GREEN)📋 Aplicando schemas Prisma...$(NC)"
	@for service in auth-service user-service campaign-service ledger-service wallet-service notification-service; do \
		echo "$(YELLOW)→ $$service$(NC)"; \
		docker exec $$service npx prisma db push --skip-generate 2>/dev/null || echo "  ⚠️  Falhou ou já sincronizado"; \
	done
	@echo "$(GREEN)✅ Schemas aplicados!$(NC)"

migrate: ## Executa migrações Prisma
	@echo "$(GREEN)📋 Executando migrações Prisma...$(NC)"
	@for service in auth-service user-service campaign-service ledger-service wallet-service notification-service; do \
		echo "$(YELLOW)→ $$service$(NC)"; \
		docker exec $$service npx prisma migrate deploy 2>/dev/null || echo "  ⚠️  Sem migrações ou erro"; \
	done
	@echo "$(GREEN)✅ Migrações executadas!$(NC)"

# ============================================
# LIMPEZA
# ============================================

clean: ## Para containers e remove volumes
	@echo "$(YELLOW)🧹 Limpando containers e volumes...$(NC)"
	@$(COMPOSE) down -v
	@echo "$(GREEN)✅ Limpeza concluída!$(NC)"

clean-all: ## Limpeza completa (containers, volumes, imagens não usadas)
	@echo "$(RED)⚠️  Limpeza completa em andamento...$(NC)"
	@$(COMPOSE) down -v --rmi local
	@docker volume prune -f
	@docker image prune -f
	@echo "$(GREEN)✅ Limpeza completa concluída!$(NC)"

# ============================================
# BUILD
# ============================================

build: ## Builda todas as imagens
	@echo "$(GREEN)🔨 Buildando imagens...$(NC)"
	@$(COMPOSE) build
	@echo "$(GREEN)✅ Build concluído!$(NC)"

rebuild: ## Rebuild forçado (sem cache)
	@echo "$(GREEN)🔨 Rebuild forçado (sem cache)...$(NC)"
	@$(COMPOSE) build --no-cache
	@echo "$(GREEN)✅ Rebuild concluído!$(NC)"

# ============================================
# LOGS
# ============================================

logs: ## Logs de todos os serviços (follow)
	@$(COMPOSE) logs -f

logs-api: ## Logs do API Gateway
	@docker logs -f api-gateway

logs-auth: ## Logs do Auth Service
	@docker logs -f auth-service

logs-user: ## Logs do User Service
	@docker logs -f user-service

logs-campaign: ## Logs do Campaign Service
	@docker logs -f campaign-service

logs-ledger: ## Logs do Ledger Service
	@docker logs -f ledger-service

logs-wallet: ## Logs do Wallet Service
	@docker logs -f wallet-service

logs-notification: ## Logs do Notification Service
	@docker logs -f notification-service

# ============================================
# SHELL (acesso aos containers)
# ============================================

shell-api: ## Shell no API Gateway
	@docker exec -it api-gateway sh

shell-auth: ## Shell no Auth Service
	@docker exec -it auth-service sh

shell-user: ## Shell no User Service
	@docker exec -it user-service sh

shell-campaign: ## Shell no Campaign Service
	@docker exec -it campaign-service sh

shell-ledger: ## Shell no Ledger Service
	@docker exec -it ledger-service sh

shell-wallet: ## Shell no Wallet Service
	@docker exec -it wallet-service sh

shell-notification: ## Shell no Notification Service
	@docker exec -it notification-service sh

# ============================================
# DESENVOLVIMENTO
# ============================================

dev: ## Inicia em modo desenvolvimento (com hot-reload)
	@echo "$(GREEN)🔧 Iniciando em modo desenvolvimento...$(NC)"
	@$(COMPOSE_DEV) up -d
	@echo "$(GREEN)✅ Modo desenvolvimento ativo!$(NC)"

prod: up ## Alias para 'make up' (modo produção)

# ============================================
# ATALHOS ÚTEIS
# ============================================

ps: status ## Alias para status

start: up ## Alias para up

stop: down ## Alias para down

reset: db-reset ## Alias para db-reset

# ============================================
# TESTES E VERIFICAÇÃO
# ============================================

test-endpoints: ## Testa endpoints principais
	@echo "$(BLUE)🧪 Testando endpoints principais...$(NC)"
	@echo ""
	@echo "1. Health check (GET /health):"
	@curl -sk -w "  Status: %{http_code}\n" https://localhost:3000/health | head -c 80
	@echo ""
	@echo ""
	@echo "2. Invitations pending (GET /invitations/pending):"
	@curl -sk -w "  Status: %{http_code}\n" https://localhost:3000/invitations/pending
	@echo ""
	@echo ""
	@echo "$(GREEN)✅ Testes concluídos!$(NC)"
	@echo "$(YELLOW)Nota: 401 = endpoint existe mas requer autenticação$(NC)"

# ============================================
# RESET NUCLEAR (quando reset normal falha)
# ============================================

nuclear: ## ☢️  RESET NUCLEAR - apaga TUDO + cache Node/Docker (último recurso)
	@echo "$(RED)☢️  ☢️  ☢️  RESET NUCLEAR ☢️  ☢️  ☢️$(NC)"
	@echo "$(RED)ISSO VAI APAGAR ABSOLUTAMENTE TUDO + CACHE:$(NC)"
	@echo "$(RED)   💀 Todos os containers Docker$(NC)"
	@echo "$(RED)   💀 Todos os volumes e dados$(NC)"  
	@echo "$(RED)   💀 Todas as imagens Docker$(NC)"
	@echo "$(RED)   💀 Todo o cache do Docker$(NC)"
	@echo "$(RED)   💀 Cache node_modules$(NC)"
	@echo "$(RED)   💀 Arquivos .next, dist, build$(NC)"
	@echo ""
	@echo "$(YELLOW)⏰ 10 segundos para cancelar (Ctrl+C)...$(NC)"
	@sleep 10
	@echo ""
	@echo "$(RED)💀 INICIANDO RESET NUCLEAR...$(NC)"
	@echo "$(RED)🛑 Parando TODO o Docker...$(NC)"
	@docker stop $$(docker ps -aq) 2>/dev/null || true
	@docker system prune -a -f --volumes
	@echo "$(RED)🗑️  Removendo cache local...$(NC)"
	@find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true  
	@find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "$(RED)🧹 Limpeza Docker completa...$(NC)"
	@docker system df
	@echo ""
	@echo "$(GREEN)✨ Reconstruindo universo do zero...$(NC)"
	@echo "$(YELLOW)Isso vai demorar... Buildando tudo novamente...$(NC)"
	@$(COMPOSE) up -d --build --force-recreate
	@echo "$(YELLOW)⏱️  Aguardando sistema estabilizar (60s)...$(NC)"
	@sleep 60
	@echo ""
	@echo "$(GREEN)✅ ☢️  RESET NUCLEAR COMPLETO! ☢️$(NC)"
	@echo "$(GREEN)🎉 Sistema totalmente reconstruído do zero!$(NC)"
	@make status
