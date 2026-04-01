# ============================================
# FT_TRANSCENDENCE - Makefile
# ============================================
# Comandos para gerenciar o projeto facilmente
# Uso: make <comando>
# ============================================

.PHONY: help up down restart logs clean clean-all db-up db-down db-reset \
        status build rebuild migrate push-schema \
        logs-api logs-auth logs-user logs-campaign logs-ledger logs-wallet logs-notification \
        shell-api shell-auth shell-user shell-campaign shell-ledger shell-wallet shell-notification \
        test health dev prod

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
	@curl -s http://localhost:3000/health | head -c 100 || echo "❌ Não responde"
	@echo ""

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

db-reset: ## Limpa e reinicia todos os bancos (CUIDADO: apaga dados!)
	@echo "$(RED)⚠️  ATENÇÃO: Isso vai APAGAR todos os dados!$(NC)"
	@echo "$(YELLOW)Parando serviços...$(NC)"
	@$(COMPOSE) down -v
	@echo "$(YELLOW)Removendo volumes de banco...$(NC)"
	@docker volume ls -q | grep -E "(auth|user|campaign|ledger|wallet|notification)" | xargs -r docker volume rm 2>/dev/null || true
	@echo "$(GREEN)🗄️  Reiniciando bancos limpos...$(NC)"
	@$(COMPOSE) up -d redis authDb userDb campaignDb ledgerDb walletDb notificationDb
	@echo "$(YELLOW)⏱️  Aguardando bancos ficarem healthy...$(NC)"
	@sleep 15
	@echo "$(GREEN)🚀 Iniciando serviços...$(NC)"
	@$(COMPOSE) up -d
	@echo "$(GREEN)✅ Reset completo! Bancos limpos e serviços rodando.$(NC)"

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
	@curl -s -w "  Status: %{http_code}\n" http://localhost:3000/health | head -c 80
	@echo ""
	@echo ""
	@echo "2. Invitations pending (GET /invitations/pending):"
	@curl -s -w "  Status: %{http_code}\n" http://localhost:3000/invitations/pending
	@echo ""
	@echo ""
	@echo "$(GREEN)✅ Testes concluídos!$(NC)"
	@echo "$(YELLOW)Nota: 401 = endpoint existe mas requer autenticação$(NC)"
