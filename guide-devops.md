# Guide DevOps — Royal Mansion Resort (Villa Booking) — Deploy AWS Free Tier

> **Objetivo:** colocar o projeto completo em produção usando apenas (ou quase) os serviços da **AWS Free Tier**.
> O app é **Next.js 14 (SSR)** + **Express 5 API** + **MySQL (Prisma)**, com pagamento **PayHere** e e-mail **Resend**.

---

## 0. Visão Geral do Projeto (o que vamos deployar)

| Camada | Stack | Porta | Build | Start |
|--------|-------|-------|-------|-------|
| Frontend (web) | Next.js 14 (SSR) | 3000 | `npm run build:web` (`next build`) | `next start` |
| API | Express 5 + TS + Prisma | 4000 | `npm run build:api` (`tsc`) | `node apps/api/dist/server.js` |
| Banco | MySQL 8 via Prisma (`provider = "mysql"`) | 3306 | — | `npm run db:migrate` |

**Arquitetura recomendada (tudo em uma EC2 Free Tier):**

```
                    Internet
                       │  (portas 80/443)
                       ▼
             ┌─────────────────────┐
             │  EC2 (t3.micro)     │  ← AWS Free Tier (750h/mês)
             │  ┌───────────────┐  │
             │  │ Caddy         │  │  ← reverse proxy + HTTPS automático (Let's Encrypt, grátis)
             │  └──────┬────────┘  │
             │         │           │
             │   ┌─────┴─────┐     │
             │   │  /api/*   │ / * │
             │   ▼           ▼     │
             │  api:4000   web:3000│
             │  └─────┬────────────┘
             │        ▼
             │      db:mysql:3306
             └─────────────────────┘
        CI/CD: GitHub Actions → ECR → SSH → docker compose
        Logs/Alerta: CloudWatch + SNS / CloudWatch Agent
```

**Por que esta arquitetura?**
- **EC2 t3.micro / t2.micro** é grátis (750 h/mês) e roda **tudo** — sem custo de ALB/Fargate.
- **MySQL dentro do EC2** (Docker) é **100% grátis** e suficiente para um hotel de escala pequena/média.
  *Alternativa:* **RDS Free Tier** (db.t2.micro/db.t3.micro MySQL) se você quiser DB gerenciado (backup automático), também 750 h/mês grátis.
- **Caddy** faz HTTPS automático (Let's Encrypt) sem custo — melhor que manter Nginx manual.
- **CloudFront + ACM** opcionais para CDN/edge caching (também há Free Tier).

---

## 1. Custo na AWS Free Tier (o que é grátis / o que cobra)

| Recurso | Free Tier | Nota |
|---------|-----------|------|
| EC2 `t3.micro` (us-east-1) | 750 h/mês (12 meses) | 1 instância 24/7 já ocupa ~730h. OK. |
| EBS 30 GB GP2 | 30 GB/mês grátis | Use disco dedicado (12+ GB) para `dbdata`. |
| RDS MySQL (opcional) | 750 h/mês `db.t2.micro`/`db.t3.micro` | Alternativa gerenciada. `db.micro` pode ser fraco. |
| ECR | 0,10 USD/GB/mês (fora do free) | Imagens pequenas → custo ~centavos. |
| CloudFront | 1 TB transferência/mês | Opcional no edge. |
| ACM (certificados) | **Grátis** | Certificados públicos não cobram. |
| CloudWatch (métricas) | 10 métricas grátis | Básico grátis; usar agente p/ logs (taxa pequena). |
| SNS | 1 mi notificações/mês grátis | Para alertas. |
| Route 53 | **Cobra** (~0,50 USD/hosted zone + ~0,40 USD/milhão de consultas) | Alternativa: DNS grátis (Cloudflare/Namecheap). |
| Secrets Manager | 30 dias de trial (10k segredos) | Depois cobra; **SSM Parameter Store Standard é grátis**. |

> ⚠️ **Importante:** Free Tier do EC2/RDS vale **12 meses** após criar a conta. Defina **alertas de custo** logo no início (Cost Explorer / Budgets) para nunca receber surpresa na fatura.

---

## 2. Pré-requisitos

```bash
# 1) Conta AWS (ativa) + AWS CLI instalado e configurado
aws configure
#    AWS Access Key ID / Secret (ideal: IAM user com policy de deploy, não a root)
#    Region: us-east-1 (mais barato e com mais Free Tier)

# 2) Node 20 + Docker instalados localmente (para testar build)
node -v      # v20.x
docker -v

# 3) Um domínio próprio (ex: royalmansion.com) com acesso ao DNS
#    (Necessário para HTTPS com Caddy/ACM; sem domínio, veja seção 8.8)

# 4) GitHub Actions
#    Seu código já deve estar num repositório GitHub (branch main)
```

**IAM recomendado (mínimo de privilégio):** crie um usuário `deploy` com:
`AmazonEC2FullAccess`, `AmazonECRFullAccess`, `IAMReadOnlyAccess`, `AmazonSNSFullAccess`, `CloudWatchFullAccessV2`. Guarde as chaves nos **secrets do GitHub** (seção 7).

---

## 3. Preparar o Projeto para Docker (faça uma vez, no seu repositório)

### 3.1 Habilite o output `standalone` do Next.js

Edite **`next.config.js`** (raiz do projeto):

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  output: "standalone",   // ← gera .next/standalone p/ o Docker (não remover)
};

module.exports = nextConfig;
```

> `images.unoptimized` já está configurado no projeto — ótimo, não depende do serviço de otimização de imagem na nuvem.

### 3.2 Crie `Dockerfile.web` (raiz do projeto)

```dockerfile
# Estágio 1: dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Estágio 2: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma || true
# NEXT_PUBLIC_* é INLINE no bundle do cliente → precisa ser definido no BUILD:
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:web

# Estágio 3: runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
```

> **Por que `ARG NEXT_PUBLIC_API_BASE_URL`?** Esse valor aparece em código **client-side** (`src/lib/api/client.ts`, `src/components/PayHerePayment.tsx`, `manage-booking`) e é *inlined no build* pelo Next.js. Sem passá-lo no build, o site tentaria chamar `http://localhost:4000` em produção. **É o erro nº 1** em deploys de Next.js + API separada.

### 3.3 Crie `Dockerfile.api` (raiz do projeto)

```dockerfile
# Estágio 1: dependências (inclui devDeps para o CLI do Prisma)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Estágio 2: build + generate Prisma
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build:api

# Estágio 3: runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
```

### 3.4 Crie `.dockerignore` (raiz) — builds rápidos e sem segredos

```gitignore
node_modules
.next
dist
.dist
.git
.env
.env.*
*.log
tests
.coverage
.next/cache
```

### 3.5 `docker-compose.yml` (produção — roda no EC2; `db` MySQL dentro do Docker = 100% grátis)

```yaml
services:
  db:
    image: mysql:8.0
    restart: unless-stopped
    command: --default-authentication-plugin=mysql_native_password
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: villa_booking
      MYSQL_USER: villa
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - dbdata:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 10

  api:
    image: ${ECR_REGISTRY}/royal-api:latest
    restart: unless-stopped
    expose: ["4000"]
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 4000
      FRONTEND_URL: https://${DOMAIN}
      API_URL: https://${DOMAIN}/api/v1
      DATABASE_URL: mysql://villa:${MYSQL_PASSWORD}@db:3306/villa_booking
      SESSION_SECRET: ${SESSION_SECRET}
      CRON_SECRET: ${CRON_SECRET}
      MANAGE_BOOKING_TOKEN_SECRET: ${MANAGE_BOOKING_TOKEN_SECRET}
      ICAL_FEED_SECRET: ${ICAL_FEED_SECRET}
      PROPERTY_TIMEZONE: Asia/Colombo
      DEFAULT_CURRENCY: LKR
      PAYHERE_MODE: ${PAYHERE_MODE}
      PAYHERE_MERCHANT_ID: ${PAYHERE_MERCHANT_ID}
      PAYHERE_MERCHANT_SECRET: ${PAYHERE_MERCHANT_SECRET}
      PAYHERE_NOTIFY_URL: https://${DOMAIN}/api/v1/payments/payhere/notify
      PAYHERE_RETURN_URL: https://${DOMAIN}/book/success
      PAYHERE_CANCEL_URL: https://${DOMAIN}/book/cancelled
      RESEND_API_KEY: ${RESEND_API_KEY}
      EMAIL_FROM: ${EMAIL_FROM}
      ADMIN_NOTIFICATION_EMAIL: ${ADMIN_NOTIFICATION_EMAIL}
      COOKIE_DOMAIN: ${COOKIE_DOMAIN}
      ADMIN_SEED_EMAIL: ${ADMIN_SEED_EMAIL}
      ADMIN_SEED_PASSWORD: ${ADMIN_SEED_PASSWORD}
      BOOKING_HOLD_MINUTES: "15"

  web:
    image: ${ECR_REGISTRY}/royal-web:latest
    restart: unless-stopped
    expose: ["3000"]
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_BASE_URL: https://${DOMAIN}/api/v1

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
      - api

volumes:
  dbdata:
  caddy_data:
  caddy_config:
```

### 3.6 `Caddyfile` (colocar na raiz do app no EC2) — HTTPS automático e roteamento

```
# Um único domínio: /api/* → api, resto → web (mesma origem = cookies simples)
${DOMAIN} {
    encode zstd gzip

    handle /api/* {
        reverse_proxy api:4000
    }

    handle /health {
        reverse_proxy api:4000
    }

    handle {
        reverse_proxy web:3000
    }
}
```

> Caddy emite o certificado Let's Encrypt sozinho (grátis). Os `handle` garantem que `/api/*` vá para a API e as páginas para o Next.js.

---

## 4. Provisionar a EC2 (Free Tier) — console AWS

1. **Console → EC2 → Launch instance**
   - **Name:** `villa-prod`
   - **AMI:** Ubuntu 22.04 LTS (HVM, 64-bit, arm/x86 ok)
   - **Instance type:** `t3.micro` (ou `t2.micro`) — badge *"Free tier eligible"*
   - **Key pair:** crie uma nova `villa-prod` (.pem) — você usará para SSH
   - **Network settings → Edit:**
     - Security group name: `villa-prod-sg`
     - Regras de entrada (inbound):
       | Tipo | Protocolo | Porta | Origem |
       |------|-----------|-------|--------|
       | SSH | TCP | 22 | Seu IP (ex: `203.0.113.5/32`) |
       | HTTP | TCP | 80 | `0.0.0.0/0` |
       | HTTPS | TCP | 443 | `0.0.0.0/0` |
   - **Configure storage:** adicione **+10 GB** GP2 (além dos 8 GB) — total ~18 GB para o banco + imagens. Mantém dentro do Free Tier de 30 GB.
   - **Launch.**

2. **IP Elástico (recomendado — o IP não muda após reboot):**
   ```bash
   # Console: EC2 → Elastic IPs → Allocate (Free Tier) → Associate com a instância
   # Anote o IP público (ex: 3.210.23.45)
   ```

3. **Aponte o DNS** (onde estiver o domínio) para a EC2:
   - Registro **A**: `@` → EC2 Public IP
   - Registro **A**: `www` → EC2 Public IP
   - (Se usar Route 53, Hosted Zone → Record sets.)

4. **SSH na instância:**
   ```bash
   chmod 400 villa-prod.pem
   ssh -i villa-prod.pem ubuntu@<EC2_PUBLIC_IP>
   ```

---

## 5. Configurar a EC2 (Docker + pastas + arquivo de ambiente)

Execute **dentro da instância** (via SSH):

```bash
# 5.1 Instalar Docker + Compose plugin
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu

# 5.2 Aplicar grupo docker (sair e entrar, ou:)
newgrp docker

# 5.3 Criar a pasta da aplicação
mkdir -p ~/app && cd ~/app

# 5.4 Criar/editar o arquivo de variáveis (NUNCA commitar!)
nano .env
```

#### Conteúdo do `~/app/.env` (substitua os valores pelos seus):

```bash
# Docker
DOMAIN=royalmansion.com                              # seu domínio
ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com   # ID da conta + região

# Banco (MySQL) — senhas fortes!
MYSQL_ROOT_PASSWORD=uma_senha_root_muito_forte
MYSQL_PASSWORD=uma_senha_app_muito_forte

# App
SESSION_SECRET=valor_aleatorio_64_chars
CRON_SECRET=valor_aleatorio_64_chars
MANAGE_BOOKING_TOKEN_SECRET=valor_aleatorio_64_chars
ICAL_FEED_SECRET=valor_aleatorio_64_chars
COOKIE_DOMAIN=royalmansion.com

# Admin inicial (o seed usa ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)
ADMIN_SEED_EMAIL=owner@royalmansion.com
ADMIN_SEED_PASSWORD=senha_admin_forte

# PayHere
PAYHERE_MODE=sandbox                    # troque para live depois de testar
PAYHERE_MERCHANT_ID=SEU_MERCHANT_ID
PAYHERE_MERCHANT_SECRET=SEU_MERCHANT_SECRET

# E-mail (Resend)
RESEND_API_KEY=seu_resend_key
EMAIL_FROM="Royal Mansion <no-reply@royalmansion.com>"
ADMIN_NOTIFICATION_EMAIL=owner@royalmansion.com
```

```bash
# 5.5 Copiar os arquivos de deploy que você criou no repositório:
#     Dockerfile.web, Dockerfile.api, docker-compose.yml, Caddyfile, .dockerignore
#     (A forma mais simples: deixar tudo no repositório e fazer git clone/rsync)

# Exemplo via rsync da sua máquina local:
rsync -avz -e "ssh -i villa-prod.pem" Dockerfile.web Dockerfile.api docker-compose.yml Caddyfile .dockerignore ubuntu@<IP>:/home/ubuntu/app/

# IMPORTANTE:
# No docker-compose.yml, troque ${DOMAIN} literal no Caddyfile:
sed -i "s/\${DOMAIN}/royalmansion.com/g" Caddyfile

# 5.6 Compor o stack (somente banco + caddy primeiro, para não faltar imagem)
docker compose --env-file .env up -d db
# aguarde alguns segundos e confira:
docker compose --env-file .env ps
```

> **Nota sobre o `DATABASE_URL`:** em produção usamos `mysql://villa:...@db:3306/villa_booking` (nome de serviço `db` do Compose). O Prisma exige `connection_limit` e `socket_timeout` em alguns casos — o default funciona bem para MySQL.

---

## 6. Repositório de imagens — Amazon ECR

Os containers são construídos no **GitHub Actions** e enviados para o **ECR**; a EC2 só faz `docker pull`.

```bash
# 6.0 Defina (substitua pelos seus valores)
REGION=us-east-1
ACCOUNT_ID=123456789012        # seu AWS account id

# 6.1 Criar repositórios
aws ecr create-repository --repository-name royal-api --region $REGION
aws ecr create-repository --repository-name royal-web --region $REGION

# 6.2 Login no ECR (necessário para push)
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# 6.3 Build local (testar antes de automatizar)
docker build -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://royalmansion.com/api/v1 \
  -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/royal-web:latest .

docker build -f Dockerfile.api -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/royal-api:latest .

# 6.4 Push
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/royal-web:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/royal-api:latest
```

> A partir daqui, não precisa mais buildar na mão — o GitHub Actions (seção 7) faz tudo. Na EC2, o deploy será só `docker compose pull && up`.

---

## 7. CI/CD — GitHub Actions

### 7.1 Secrets exigidos no repositório (Settings → Secrets and variables → Actions)

| Secret | Exemplo |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | do usuário `deploy` |
| `AWS_SECRET_ACCESS_KEY` | idem |
| `AWS_REGION` | `us-east-1` |
| `ECR_REGISTRY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `EC2_HOST` | `3.210.23.45` |
| `EC2_SSH_KEY` | conteúdo da `villa-prod.pem` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://royalmansion.com/api/v1` |

### 7.2 Workflow — `.github/workflows/deploy.yml`

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma generate --schema=apps/api/prisma/schema.prisma
      - run: npm run typecheck
      - run: npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      - name: Login ECR
        run: |
          aws ecr get-login-password --region $AWS_REGION | \
          docker login --username AWS --password-stdin $ECR_REGISTRY
      - name: Build & push web
        run: |
          docker build -f Dockerfile.web \
            --build-arg NEXT_PUBLIC_API_BASE_URL=${{ secrets.NEXT_PUBLIC_API_BASE_URL }} \
            -t $ECR_REGISTRY/royal-web:latest .
          docker push $ECR_REGISTRY/royal-web:latest
      - name: Build & push api
        run: |
          docker build -f Dockerfile.api -t $ECR_REGISTRY/royal-api:latest .
          docker push $ECR_REGISTRY/royal-api:latest

  deploy:
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            set -e
            cd /home/ubuntu/app
            docker compose --env-file .env pull
            docker compose --env-file .env run --rm api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
            docker compose --env-file .env up -d --remove-orphans --force-recreate
            sleep 5
            curl -fsS https://${DOMAIN}/health || echo "HEALTH CHECK FAILED"
            docker compose --env-file .env ps
```

> **Fluxo:** push em `main` → roda testes → builda e envia as duas imagens ao ECR → faz SSH na EC2 → `pull`, aplica migrations (Prisma), sobe os containers e valida o `/health`.

---

## 8. Primeiro Deploy, Migrations e Verificação

### 8.1 Aplicar migrations (depende do MySQL estar up)

```bash
cd ~/app
# (a) rodar migrations uma vez (ou deixar o CI fazer)
docker compose --env-file .env run --rm api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# (b) seed opcional (cria pacotes/quartos/admin iniciais)
docker compose --env-file .env run --rm api npx prisma db seed --schema=apps/api/prisma/schema.prisma
#   (se o seed não estiver configurado no package.json, rode: npx tsx apps/api/prisma/seed.ts)
```

### 8.2 Subir os containers

```bash
docker compose --env-file .env up -d --remove-orphans
docker compose --env-file .env ps   # tudo "running" e db "healthy"
```

### 8.3 Verificar o health check

```bash
# De dentro do EC2
docker compose --env-file .env exec api curl -s localhost:4000/health
# → {"ok":true}

# De fora (via Caddy/HTTPS — só depois do DNS propagar)
curl -s https://royalmansion.com/health
curl -sI https://royalmansion.com/          # HTTP/2 200
```

### 8.4 Testes rápidos no navegador

- [ ] `https://royalmansion.com` carrega a home?
- [ ] `/admin/login` permite logar com o admin seed?
- [ ] Criar uma reserva de teste em `/booking` (PayHere em sandbox).
- [ ] `https://royalmansion.com/api/v1/...` responde (public routes).
- [ ] E-mail de confirmação chegou (Resend)?

---

## 9. Monitoramento e Alertas (CloudWatch + SNS)

### 9.1 Instalar o CloudWatch Agent na EC2 (logs)

```bash
cd ~/app
# CloudWatch agent coleta logs dos containers (docker json-file → cloudwatch)
sudo apt-get install -y amazon-cloudwatch-agent
cat > /opt/aws/amazon-cloudwatch-agent/bin/config.json <<'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          { "file_path": "/var/lib/docker/containers/*/*-json.log", "log_group_name": "villa-prod", "log_stream_name": "api-web" }
        ]
      }
    }
  }
}
EOF
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s
```

> A API já emite **logs estruturados JSON** (pino-http) e faz redact de `authorization`/`md5sig` — perfeito para o CloudWatch Logs Insights.

### 9.2 Alertas de CPU/disco/erros (SNS + CloudWatch)

```bash
# 9.2.1 Criar tópico SNS (Free Tier: 1 mi notificações/mês)
aws sns create-topic --name villa-alerts

# 9.2.2 Cadastrar seu e-mail (vai cair uma confirmação)
aws sns subscribe --topic-arn <TOPIC_ARN> --protocol email --notification-endpoint voce@exemplo.com

# 9.2.3 Alarme de CPU > 80% (5 min)
aws cloudwatch put-metric-alarm \
  --alarm-name villa-cpu-high \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --dimensions Name=InstanceId,Value=<EC2_INSTANCE_ID> \
  --period 300 --evaluation-periods 1 --statistic Average \
  --threshold 80 --comparison-operator GreaterThanThreshold \
  --alarm-actions <TOPIC_ARN>

# 9.2.4 Alarme de disco (EBS) > 85%
aws cloudwatch put-metric-alarm \
  --alarm-name villa-disk-high \
  --metric-name StatusCheckFailed_System --namespace AWS/EC2 \
  --dimensions Name=InstanceId,Value=<EC2_INSTANCE_ID> \
  --period 300 --evaluation-periods 2 --statistic Maximum \
  --threshold 1 --comparison-operator GreaterThanThreshold \
  --alarm-actions <TOPIC_ARN>
```

### 9.3 Dashboard de um minuto

Crie um **CloudWatch Dashboard** com: CPU, NetworkIn/Out, StatusChecks e as métricas do EBS. Grátis nas 10 métricas básicas.

---

## 10. Rollback (Plano de Deploy Seguro)

Como trabalhamos com a tag `latest` + Compose, o rollback é rápido:

```bash
cd ~/app
# 1) Subir a versão anterior (src/commit anterior) e re-tag:
#    docker tag <ECR>/royal-api:<commit-anterior> <ECR>/royal-api:latest  (na máquina de build)

# 2) Na EC2, basta reconstruir com o commit anterior via GitHub Actions
#    OU (manual) reverter o compose para uma imagem antiga:
git checkout <COMMIT_ANTERIOR>
docker compose --env-file .env up -d --force-recreate
docker compose --env-file .env ps
```

**Práticas que tornam rollback fácil:**
- **Fixe as imagens por SHA/commit**, não só `latest`. No Compose use `royal-web:<git-sha>` e no CI injete o SHA. Assim você sabe exatamente qual versão está no ar.
- **Banco:** migrations do Prisma são incrementais e reversíveis de forma manual. Antes de migrar em produção, faça backup:
  ```bash
  docker compose --env-file .env exec db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" villa_booking > backup_$(date +%F).sql
  ```
- Backups **diários** no S3 (free tier 5 GB) via `mysqldump` + `aws s3 cp` (cron/`crontab -e`).

---

## 11. Checklist de Produção (antes do lançamento)

- [ ] Variáveis de ambiente via arquivo `.env` na EC2 ou **SSM Parameter Store** (nunca no repositório / `git`).
- [ ] `/health` respondendo (302/200) e monitorado.
- [ ] Logs estruturados (JSON) com `request_id` (a API já usa pino; ativar `response.requestId` se desejar).
- [ ] Rate limiting configurado — **já ativo** na API: `rateLimit 120 req/min` + `trust proxy`.
- [ ] CORS restrito ao domínio (`FRONTEND_URL` = `https://royalmansion.com`). Já configurado.
- [ ] MySQL com **backup automático** (RDS: snapshots; Docker: cron de `mysqldump` + S3).
- [ ] Container/API com **timeout adequado** (`express` default fine; Caddy timeout `reverse_proxy { flush_interval ... }` se preciso).
- [ ] CloudWatch alarmes para **erros e latência** (seção 9).
- [ ] Plano de rollback documentado (seção 10).
- [ ] **Load test** antes do lançamento (ex: `k6`/`hey` — `hey -z 30s https://royalmansion.com/`).
- [ ] PayHere em **live** com `PAYHERE_MODE=live` e URLs de notify apontando para o HTTPS real.
- [ ] `NODE_ENV=production` e `NEXT_PUBLIC_API_BASE_URL` correto no build.
- [ ] Segurança: security group só abre 22 para seu IP; 80/443 abertos.

---

## 12. Troubleshooting & Erros Comuns

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Site abre mas API `localhost` | `NEXT_PUBLIC_API_BASE_URL` não passado no build | Rebuild web com `--build-arg NEXT_PUBLIC_API_BASE_URL=https://dominio/api/v1` |
| `400 invalid environment` na API | faltou variável obrigatória (ex: `DATABASE_URL`, `SESSION_SECRET`) | Conferir o `.env` da EC2 e o `environment:` do Compose |
| `P1001 can't reach database` do Prisma | MySQL não pronto / URL errada | Esperar `service_healthy`; checar `docker compose ps db`; usar host `db` |
| CORS bloqueado no admin | `FRONTEND_URL` errado / `COOKIE_DOMAIN` | Usar API e front na **mesma origem** e `FRONTEND_URL=https://dominio` |
| Login admin falha / cookie some | `COOKIE_DOMAIN` incorreto ou HTTP | Manter `COOKIE_DOMAIN=dominio` sem `http://`; só HTTPS |
| `502 Bad Gateway` no Caddy | web/api ainda subindo | `docker compose logs -f web api caddy`; aguardar health |
| Certificado não emite | DNS não propagou / porta 80 fechada | `dig +short dominio` = IP da EC2; abrir 80/443 no SG |
| PayHere notify 404 | URL de notify aponta p/ subpath errado | `PAYHERE_NOTIFY_URL=https://dominio/api/v1/payments/payhere/notify` |
| E-mail não sai | chave Resend inválida/domínio | Validar `RESEND_API_KEY` e domínio verificado no Resend |
| EC2 muito lenta (t3 micro) | pouca RAM (1 GB) | Não rodar build na EC2; build só no CI; limitar Node `NODE_OPTIONS=--max-old-space-size=256` se precisar |

### 12.1 Logs úteis

```bash
docker compose --env-file .env logs -f api        # API (JSON)
docker compose --env-file .env logs -f web        # Next
docker compose --env-file .env logs -f caddy      # proxy/TLS
docker compose --env-file .env logs -f db         # MySQL
docker compose --env-file .env top                # uso de CPU/RAM
```

---

## 13. Alternativas e Recomendações Adicionais

### 13.1 Usar RDS MySQL (Free Tier) em vez do MySQL no Docker

Se quiser banco **gerenciado** (backup automático, failover, upgrades):

```bash
# Criar instância RDS MySQL db.t3.micro (badge free tier)
aws rds create-db-instance \
  --db-instance-identifier villa-db \
  --engine mysql --db-instance-class db.t3.micro \
  --allocated-storage 20 --storage-type gp3 \
  --master-username villa --master-user-password 'SenhaFortissima!1' \
  --db-name villa_booking --publicly-accessible false \
  --vpc-security-group-ids sg-xxxxxxxx --multi-az false
```

- Coloque a EC2 e o RDS na **mesma VPC** (a EC2 alcança o RDS pelo endpoint privado, sem precisar expor à internet).
- No Compose, troque `DATABASE_URL` para `mysql://villa:SENHA@<RDS_ENDPOINT>:3306/villa_booking` e **remova o serviço `db`** (apenas API/web/caddy).
- RDS tem backup automático incluído — mais seguro que mysqldump manual.

### 13.2 Front global com CloudFront + ACM (opcional, também grátis)

Se quiser CDN em versões futuras:
1. **ACM** → peça certificado público para `royalmansion.com` e `*.royalmansion.com` (validação DNS).
2. **CloudFront** → Distribution com origin = EC2 (ou IP), comportamento padrão passando `/api/*` direto.
3. Coloque o alias/`CNAME` do domínio na Distribution.

> Para o **Next.js SSR** isso exige cuidado com cache (não cachear páginas autenticadas). Comece sem CloudFront; adicione depois.

### 13.3 Sem domínio próprio (apenas teste)

- Use o IP público direto com Caddy: `curl http://<EC2>` já responde.
- Caddy suporta **HTTPS local** via `tls internal` (sem domínio público):
  ```
  :443 {
      tls internal
      handle /api/* { reverse_proxy api:4000 }
      handle { reverse_proxy web:3000 }
  }
  ```
  (Navegador vai reclamar do certificado autoassinado — ok para teste interno.)

---

## 14. Referência Rápida de Comandos

| Ação | Comando |
|------|---------|
| Build web (local) | `docker build -f Dockerfile.web --build-arg NEXT_PUBLIC_API_BASE_URL=https://DOMINIO/api/v1 -t royal-web .` |
| Build api (local) | `docker build -f Dockerfile.api -t royal-api .` |
| Push imagens | `docker push <ECR>/royal-web:latest` e `.../royal-api:latest` |
| Ver stack na EC2 | `docker compose --env-file .env ps` |
| Logs | `docker compose --env-file .env logs -f api` |
| Migrations | `docker compose --env-file .env run --rm api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma` |
| Deploy manual | `docker compose --env-file .env pull && docker compose --env-file .env up -d --force-recreate` |
| Health | `curl -s https://DOMINIO/health` |
| Backup DB | `docker compose --env-file .env exec db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" villa_booking > backup.sql` |
| Rollback | rebuild a imagem anterior (seção 10) |
| Deletar stack | `docker compose --env-file .env down -v` (apaga volumes! cuidado) |

---

## 15. Endurecimento de Segurança

- **Never commit secrets.** `.env` está no `.gitignore`? Confira. Use **SSM Parameter Store** (grátis, standard tier) para chaves em vez de arquivo, se quiser:
  ```bash
  aws ssm put-parameter --name "/villa/PayHereSecret" --type SecureString --value "..." --overwrite
  ```
- **Rotacione** `SESSION_SECRET`/`CRON_SECRET`/`MANAGE_BOOKING_TOKEN_SECRET`/`ICAL_FEED_SECRET` periodicamente.
- **Minimize o IAM**: usuário `deploy` sem acesso a outras contas/serviços desnecessários.
- Atualize a imagem base (`node:20-alpine`) e rode `npm audit` no CI.
- `docker compose` com `restart: unless-stopped` + healthchecks = recuperação automática de crash.
- Mantenha o SG de SSH restrito **ao seu IP**.

---

## Resumo do Roteiro (ordem de execução)

1. Altere `next.config.js` → `output: "standalone"`.
2. Crie `Dockerfile.web`, `Dockerfile.api`, `.dockerignore`, `docker-compose.yml`, `Caddyfile`.
3. Terra na AWS: usuário IAM `deploy` + chaves no GitHub.
4. Crie a **EC2 t3.micro** (+ EBS), Elastic IP, SG (22/80/443), aponta DNS.
5. Instale Docker na EC2; crie `~/app/.env` e copie os arquivos.
6. Crie os repositórios **ECR** (`royal-api`, `royal-web`).
7. Adicione o workflow `deploy.yml` e os **secrets** no GitHub; faça push em `main`.
8. Acompanhe o pipeline; veja migração + containers + `/health`.
9. Configure **CloudWatch + SNS** e o **backup diário**.
10. Rode o **checklist de produção** (seção 11) e saia do PayHere sandbox.

---

*Este guia usa AWS Free Tier (EC2 + ECR + CloudWatch + SNS + opcional RDS/CloudFront). Custos além do free tier: domínio, Route 53 (se usado), ECR storage (>1GB), CloudWatch Logs acima de 5GB e tráfego de saída da EC2 acima de 100GB/mês.*











