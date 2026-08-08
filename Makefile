# ============================================================
# PR1AS Makefile
#
# Usage: make <target> [ENV=local|prod]
#
# Examples:
#   make up               → khởi động local (mặc định)
#   make up ENV=prod      → khởi động Production
#   make build ENV=prod   → build image cho Production
#   make logs             → xem logs realtime
# ============================================================

ENV ?= local

COMPOSE_DIR    = docker-compose
ENV_FILE       = $(COMPOSE_DIR)/.env.$(ENV)
BASE_COMPOSE   = $(COMPOSE_DIR)/docker-compose.yml

ifeq ($(ENV),local)
  COMPOSE_FILES = -f $(BASE_COMPOSE) -f $(COMPOSE_DIR)/docker-compose.local.yml
else
  COMPOSE_FILES = -f $(BASE_COMPOSE)
endif

DC = docker-compose $(COMPOSE_FILES) --env-file $(ENV_FILE)

.PHONY: help up down build rebuild restart ps \
        logs server-logs client-logs \
        server-shell client-shell \
        build-server build-client clean nuke check-env

# ─── Help ────────────────────────────────────────────────────

help:
	@echo ""
	@echo "PR1AS — Docker Makefile"
	@echo "========================"
	@echo ""
	@echo "  make up [ENV=local|prod]       Khởi động tất cả services"
	@echo "  make down [ENV=...]            Dừng và xóa containers"
	@echo "  make build [ENV=...]           Build Docker images"
	@echo "  make rebuild [ENV=...]         Build lại (no-cache) rồi up"
	@echo "  make restart [ENV=...]         Restart tất cả services"
	@echo "  make ps [ENV=...]              Liệt kê container đang chạy"
	@echo ""
	@echo "  make logs [ENV=...]            Xem tất cả logs realtime"
	@echo "  make server-logs [ENV=...]     Logs của server"
	@echo "  make client-logs [ENV=...]     Logs của client"
	@echo ""
	@echo "  make server-shell [ENV=...]    Vào shell container server"
	@echo "  make client-shell [ENV=...]    Vào shell container client"
	@echo ""
	@echo "  make build-server [ENV=...]    Build chỉ server image"
	@echo "  make build-client [ENV=...]    Build chỉ client image"
	@echo ""
	@echo "  make clean [ENV=...]           Dừng + xóa images"
	@echo "  make nuke                      Xóa toàn bộ Docker data local"
	@echo ""
	@echo "  ENV mặc định = local"
	@echo ""

# ─── Kiểm tra env file tồn tại ───────────────────────────────

check-env:
	@if [ ! -f "$(ENV_FILE)" ]; then \
		echo ""; \
		echo "ERROR: Không tìm thấy $(ENV_FILE)"; \
		echo "       Sao chép từ docker-compose/.env.example và điền giá trị"; \
		echo ""; \
		exit 1; \
	fi

# ─── Core commands ───────────────────────────────────────────

up: check-env
	@echo ">> Khởi động PR1AS [ENV=$(ENV)]..."
	@$(DC) up -d
	@echo ""
	@$(DC) ps

down: check-env
	@echo ">> Dừng PR1AS [ENV=$(ENV)]..."
	@$(DC) down

build: check-env
	@echo ">> Build images [ENV=$(ENV)]..."
	@$(DC) build

rebuild: check-env
	@echo ">> Build lại (no-cache) và khởi động [ENV=$(ENV)]..."
	@$(DC) build --no-cache
	@$(DC) up -d

restart: check-env
	@echo ">> Restart services [ENV=$(ENV)]..."
	@$(DC) restart

ps: check-env
	@$(DC) ps

# ─── Logs ────────────────────────────────────────────────────

logs: check-env
	@$(DC) logs -f --tail=100

server-logs: check-env
	@$(DC) logs -f --tail=100 server

client-logs: check-env
	@$(DC) logs -f --tail=100 client

# ─── Shell access ────────────────────────────────────────────

server-shell: check-env
	@$(DC) exec server sh

client-shell: check-env
	@$(DC) exec client sh

# ─── Build riêng từng service ────────────────────────────────

build-server: check-env
	@echo ">> Build server image [ENV=$(ENV)]..."
	@$(DC) build server

build-client: check-env
	@echo ">> Build client image [ENV=$(ENV)]..."
	@$(DC) build client

# ─── Dọn dẹp ────────────────────────────────────────────────

clean: check-env
	@echo ">> Dừng containers và xóa images [ENV=$(ENV)]..."
	@$(DC) down --rmi local

nuke:
	@echo ">> Xóa toàn bộ Docker data local (containers, images, volumes)..."
	@docker-compose -f $(BASE_COMPOSE) -f $(COMPOSE_DIR)/docker-compose.local.yml \
		--env-file $(COMPOSE_DIR)/.env.local down --rmi local -v --remove-orphans

