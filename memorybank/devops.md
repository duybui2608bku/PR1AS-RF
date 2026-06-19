# Memory Bank - DevOps (Docker + CI/CD)

## Tổng quan

Mục tiêu thiết lập hạ tầng DevOps cho PR1AS với 2 môi trường:

| Môi trường     | Mục đích               | MongoDB           | Chạy bằng               |
| -------------- | ---------------------- | ----------------- | ----------------------- |
| **local**      | Dev trên máy cá nhân   | Atlas `pr1as_dev` | `npm run dev` trực tiếp |
| **production** | Server thật, user thật | Atlas `pr1as`     | CI/CD tự động           |

**Quyết định quan trọng**: Developer dùng Atlas bình thường, chỉ đổi `DB_NAME=pr1as_dev` để tách khỏi production. Docker KHÔNG dùng cho dev hàng ngày — chỉ dùng để build image và chạy trên VPS production.

---

## Cấu trúc file DevOps

```
PR1AS-RF/
├── Makefile                          # Entry point: make up / make build / make logs
├── .gitignore                        # Ignore env files chứa credentials thật
│
├── docker/
│   ├── Dockerfile.server             # Multi-stage build cho SERVER/
│   └── Dockerfile.client             # Multi-stage build cho pr1as-client/
│
├── docker-compose/
│   ├── docker-compose.yml            # Base: server + client services
│   ├── docker-compose.local.yml      # Override local: thêm mongodb service
│   ├── .env.local                    # Local env vars (commit được)
│   ├── .env.prod                     # Prod placeholder (commit được, credentials thật trên VPS)
│   └── .env.example                  # Template hướng dẫn
│
├── nginx/
│   └── pr1as.conf                    # Reverse proxy: /api/ → server, / → client
│
└── .github/
    └── workflows/
        ├── ci.yml                    # Lint + typecheck mọi push
        └── deploy-prod.yml           # Build + deploy production với manual approval
```

---

## Docker

### Tại sao dùng Docker?

Không cần cài Node.js, MongoDB đúng version trên mỗi máy. Chạy `make up` là xong, giống nhau trên mọi máy.

### Multi-stage build — tại sao?

Build Docker cần TypeScript compiler, devDependencies — nhưng image production không cần. Multi-stage build tách rời:

- **Stage builder**: compile code, cần mọi tool
- **Stage runner**: chỉ chứa code đã compile + production deps → image nhỏ hơn 5-10x

### Dockerfile.server (`docker/Dockerfile.server`)

Build context: `SERVER/`

```
deps stage:    node:20-alpine + npm ci --only=production
builder stage: npm ci (all) + npm run build (tsc → dist/)
runner stage:  copy dist/ + prod node_modules, EXPOSE 3052
```

### Dockerfile.client (`docker/Dockerfile.client`)

Build context: `pr1as-client/`. Yêu cầu `output: "standalone"` trong `next.config.mjs`.

```
deps stage:    node:20-alpine + npm ci
builder stage: copy node_modules + source + ARG NEXT_PUBLIC_* → npm run build
runner stage:  copy .next/standalone + .next/static + public/, EXPOSE 3000
```

> **Lưu ý NEXT*PUBLIC*\* vars**: Next.js bake các biến `NEXT_PUBLIC_` vào bundle lúc build — không thể thay đổi sau khi build. Phải truyền vào lúc `docker build` qua build ARG, không phải runtime ENV.

---

## Docker Compose

### Logic ghép file

```
Local:  docker-compose.yml + docker-compose.local.yml + .env.local
Prod:   docker-compose.yml                            + .env.prod
```

`docker-compose.local.yml` bổ sung service `mongodb` và thêm `depends_on: mongodb` cho server.
UAT/Prod không cần MongoDB container vì dùng Atlas ngoài.

### Mạng nội bộ `pr1as-net`

Các container giao tiếp nhau qua tên service (không phải localhost):

- Server gọi MongoDB: `mongodb://mongodb:27017` (tên service là `mongodb`)
- Nginx proxy đến server: `http://server:3052`
- Nginx proxy đến client: `http://client:3000`

### Thứ tự khởi động

```
mongodb → server → client
```

`depends_on` đảm bảo MongoDB sẵn sàng trước khi server khởi động.

---

## Makefile — Cách dùng

```bash
# Khởi động (ENV mặc định = local)
make up                    # local: MongoDB + server + client
make up ENV=prod           # production: server + client (MongoDB là Atlas)

# Build lại sau khi thay đổi code
make build                 # build images
make rebuild               # build no-cache + up

# Theo dõi
make logs                  # tất cả logs realtime
make server-logs           # chỉ server
make client-logs           # chỉ client
make ps                    # liệt kê container đang chạy

# Debug
make server-shell          # vào shell container server
make mongo-shell           # vào mongosh (chỉ local)

# Dừng
make down                  # dừng + xóa containers
make clean                 # dừng + xóa images
make nuke                  # xóa toàn bộ (containers + images + volumes)

# Dev shortcut: chỉ bật MongoDB, chạy server/client ngoài Docker
make db-only               # chỉ MongoDB container
make db-down               # tắt MongoDB container
```

---

## Quản lý biến môi trường

### Quy tắc

| File                        | Git             | Chứa gì                        |
| --------------------------- | --------------- | ------------------------------ |
| `docker-compose/.env.local` | ✅ Commit       | Vars local dev, không nhạy cảm |
| `docker-compose/.env.prod`  | ✅ Commit       | Placeholder `REPLACE_WITH_*`   |
| `.env.prod` thật trên VPS   | ❌ Chỉ trên VPS | Credentials thật production    |
| `SERVER/.env`               | ❌ Gitignored   | Credentials dev team           |
| `SERVER/.env.example`       | ✅ Commit       | Template không có giá trị      |

### Biến quan trọng phân biệt local vs production

| Biến             | Local                     | Production                  |
| ---------------- | ------------------------- | --------------------------- |
| `MONGODB_URI`    | `mongodb://mongodb:27017` | `mongodb+srv://...atlas...` |
| `DB_NAME`        | `pr1as_dev`               | `pr1as_production`          |
| `JWT_EXPIRE`     | `7d` (tiện dev)           | `15m` (bảo mật)             |
| `NODE_ENV`       | `development`             | `production`                |
| `RATE_LIMIT_MAX` | `1000`                    | `100`                       |

---

## MongoDB

### Local: Docker container

```
Container: pr1as-mongodb (mongo:7.0)
Port:       27017 → 27017
Volume:     mongodb-data (persistent trên máy dev)
Database:   pr1as_local
```

Data tồn tại giữa các lần restart. Chỉ mất khi chạy `make nuke` hoặc xóa volume thủ công.

### Production: MongoDB Atlas

```
Cluster:   1 cluster M0 (miễn phí)
Database:  pr1as_production   ← production (tên rõ ràng, tránh nhầm)
           pr1as_dev          ← developer (data test)
```

Atlas quản lý backup, monitoring, scaling. Developer không kết nối trực tiếp Atlas khi dev.

### Developer mới setup

```bash
# Dùng Docker MongoDB (khuyến nghị)
make db-only              # bật MongoDB container
# Server kết nối qua MONGODB_URI=mongodb://mongodb:27017

# Hoặc kết nối Atlas trực tiếp (nếu team lead cấp URI)
# Đổi MONGODB_URI trong SERVER/.env thành Atlas URI
# Dùng DB_NAME=pr1as_local để tách khỏi production
```

---

## Nginx

### Vai trò

Nginx đứng trước toàn bộ hệ thống trên VPS:

```
Internet → Nginx (port 80/443) → server container :3052
                               → client container :3000
```

Container server và client **không** expose port trực tiếp ra internet — chỉ nói chuyện với Nginx.

### Routing (`nginx/pr1as.conf`)

```
/socket.io/*  → server:3052   (WebSocket upgrade, đặt trước /api/)
/api/*        → server:3052   (REST API)
/*            → client:3000   (Next.js app, catch-all)
```

> **Lưu ý thứ tự**: `/socket.io/` phải khai báo trước `/api/` trong config. Nếu đảo ngược, Socket.IO không hoạt động.

### SSL

Certbot + Let's Encrypt cấp SSL certificate miễn phí, tự động gia hạn mỗi 90 ngày. Chạy 1 lần:

```bash
certbot --nginx -d DOMAIN -d www.DOMAIN
```

---

## CI/CD — GitHub Actions

### Luồng tổng thể

```
git push (bất kỳ branch)
    ↓
ci.yml: lint + typecheck + build
    ↓ (nếu pass)
Pull Request → merge vào main
    ↓
deploy-prod.yml:
  build job: build images + push ghcr.io
    ↓
  deploy job: DỪNG → chờ manual approval
    ↓ (team lead bấm Approve trên GitHub)
  SSH vào VPS → docker pull → make up ENV=prod
```

### `ci.yml` — Chạy mọi lúc

Trigger: push bất kỳ branch, PR vào `main`

```
server-ci:  npm ci → npm run lint → npm run build (typecheck implicit)
client-ci:  npm ci → npm run lint → npm run typecheck
```

PR không thể merge nếu CI fail.

### `deploy-prod.yml` — Deploy production

Trigger: push vào `release` (sau khi merge từ `main`)

```
build job:
  - Login ghcr.io
  - docker build Dockerfile.server → ghcr.io/TuanAnhDevIT/pr1as-server:latest
  - docker build Dockerfile.client → ghcr.io/TuanAnhDevIT/pr1as-client:latest
  - docker push cả 2

deploy job (environment: production → cần approval):
  - SSH vào VPS
  - cd /opt/pr1as
  - docker pull images mới
  - make up ENV=prod
```

### GitHub setup cần thiết (khi có VPS)

**GitHub Secrets** (Settings → Secrets → Actions):

```
PROD_SSH_HOST              IP VPS
PROD_SSH_USER              ubuntu hoặc root
PROD_SSH_PRIVATE_KEY       nội dung ~/.ssh/id_rsa
PROD_NEXT_PUBLIC_API_URL   https://api.DOMAIN/api
PROD_NEXT_PUBLIC_SOCKET_URL https://api.DOMAIN
PROD_GOOGLE_CLIENT_ID      Google OAuth Client ID
```

**GitHub Environment** (Settings → Environments → production):

- Required reviewers: `@TuanAnhDevIT` hoặc mail khác
- Mọi deploy production phải được approve trước

---

## Onboarding developer mới

```bash
# 1. Clone repo
git clone https://github.com/TuanAnhDevIT/PR1AS-RF.git
cd PR1AS-RF

# 2. Setup SERVER env
cp SERVER/.env.example SERVER/.env
# Điền MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID (nhận từ team lead)

# 3. Setup client env
cp pr1as-client/.env.local.example pr1as-client/.env.local
# Điền JWT_SECRET, NEXT_PUBLIC_GOOGLE_CLIENT_ID (nhận từ team lead)

# 4. Khởi động toàn bộ stack
make up

# 5. Kiểm tra
curl http://localhost:3052/api   # server OK
# Mở http://localhost:3000      # client OK
```

---

## TODO — Chờ thông tin VPS/Domain

- [ ] Điền domain thật vào `nginx/pr1as.conf` (thay `DOMAIN`)
- [ ] Tạo `.env.prod` với credentials thật **trực tiếp trên VPS** tại `/opt/pr1as/docker-compose/.env.prod`
- [ ] Tạo GitHub Secrets: SSH credentials + NEXT_PUBLIC vars
- [ ] Tạo GitHub Environment `production` với required reviewer
- [ ] Cài Docker + Nginx + Certbot lên VPS
- [ ] Copy `nginx/pr1as.conf` → `/etc/nginx/conf.d/pr1as.conf` trên VPS
- [ ] Chạy `certbot --nginx -d DOMAIN -d www.DOMAIN`
- [ ] Trỏ DNS domain về IP VPS
