# DevOps Guide — Royal Mansion Resort (Villa Booking) — AWS Free Tier Deployment

> **Goal:** get the entire project into production using AWS **Free Tier** services (or almost entirely free).
> The app is **Next.js 14 (SSR)** + **Express 5 API** + **MySQL (Prisma)**, with **PayHere** payments and **Resend** email.

---

## 0. Project Overview (what we are deploying)

| Layer | Stack | Port | Build | Start |
|-------|-------|------|-------|-------|
| Frontend (web) | Next.js 14 (SSR) | 3000 | `npm run build:web` (`next build`) | `next start` |
| API | Express 5 + TS + Prisma | 4000 | `npm run build:api` (`tsc`) | `node apps/api/dist/server.js` |
| Database | MySQL 8 via Prisma (`provider = "mysql"`) | 3306 | — | `npm run db:migrate` |

**Recommended architecture (all on one Free Tier EC2):**

```
                    Internet
                       │  (ports 80/443)
                       ▼
             ┌─────────────────────┐
             │  EC2 (t3.micro)     │  ← AWS Free Tier (750h/month)
             │  ┌───────────────┐  │
             │  │ Caddy         │  │  ← reverse proxy + auto HTTPS (Let's Encrypt, free)
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
        Logs/Alerts: CloudWatch + SNS / CloudWatch Agent
```

**Why this architecture?**
- **EC2 t3.micro / t2.micro** is free (750 h/month) and runs **everything** — no ALB/Fargate cost.
- **MySQL inside the EC2** (Docker) is **100% free** and enough for a small/medium hotel.
  *Alternative:* **RDS Free Tier** (db.t2.micro/db.t3.micro MySQL) for a managed database (automatic backup), also 750 h/month free.
- **Caddy** handles HTTPS automatically (Let's Encrypt) at no cost — simpler than maintaining Nginx manually.
- **CloudFront + ACM** are optional for a global CDN/edge caching (also covered by Free Tier).

---

## 1. AWS Free Tier Cost Breakdown (what's free / what costs)

| Resource | Free Tier | Note |
|----------|-----------|------|
| EC2 `t3.micro` (us-east-1) | 750 h/month (12 months) | 1 instance 24/7 already uses ~730h. OK. |
| EBS 30 GB GP2 | 30 GB/month free | Use dedicated disk (12+ GB) for `dbdata`. |
| RDS MySQL (optional) | 750 h/month `db.t2.micro`/`db.t3.micro` | Managed alternative. `db.micro` can be underpowered. |
| ECR | 0.10 USD/GB/month (outside free) | Small images → cost in cents. |
| CloudFront | 1 TB transfer/month | Optional at the edge. |
| ACM (certificates) | **Free** | Public certificates are not charged. |
| CloudWatch (metrics) | 10 metrics free | Basics free; use agent for logs (small charge). |
| SNS | 1M notifications/month free | For alerts. |
| Route 53 | **Charges** (~0.50 USD/hosted zone + ~0.40 USD/million queries) | Alternative: free DNS (Cloudflare/Namecheap). |
| Secrets Manager | 30-day trial (10k secrets) | Charged after; **SSM Parameter Store Standard is free**. |

> ⚠️ **Important:** the EC2/RDS Free Tier lasts **12 months** after you create your account. Set up **cost alerts** (Cost Explorer / Budgets) early so you never get a billing surprise.

---

## 2. Prerequisites

```bash
# 1) AWS account (active) + AWS CLI installed and configured
aws configure
#    AWS Access Key ID / Secret (ideally an IAM user with a deploy policy, not root)
#    Region: us-east-1 (cheapest and most Free Tier)

# 2) Node 20 + Docker installed locally (to test the build)
node -v      # v20.x
docker -v

# 3) Your own domain (e.g. royalmansion.com) with DNS access
#    (Required for HTTPS with Caddy/ACM; without a domain see section 13.3)

# 4) GitHub Actions
#    Your code must already be in a GitHub repository (main branch)
```

**Recommended IAM (least privilege):** create a `deploy` user with:
`AmazonEC2FullAccess`, `AmazonECRFullAccess`, `IAMReadOnlyAccess`, `AmazonSNSFullAccess`, `CloudWatchFullAccessV2`. Store the keys in the **GitHub secrets** (section 7).

---

## 3. Prepare the Project for Docker (do once, in your repository)

### 3.1 Enable the Next.js `standalone` output

Edit **`next.config.js`** (project root):

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  output: "standalone",   // ← generates .next/standalone for Docker (don't remove)
};

module.exports = nextConfig;
```

> `images.unoptimized` is already set in this project — great, it removes the dependency on a cloud image-optimization service.

### 3.2 Create `Dockerfile.web` (project root)

```dockerfile
# Stage 1: dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma || true
# NEXT_PUBLIC_* is INLINED into the client bundle → must be set at BUILD time:
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:web

# Stage 3: runtime
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

> **Why `ARG NEXT_PUBLIC_API_BASE_URL`?** This value appears in **client-side** code (`src/lib/api/client.ts`, `src/components/PayHerePayment.tsx`, `manage-booking`) and is *inlined at build time* by Next.js. If you don't pass it at build time, the site will try to call `http://localhost:4000` in production. **This is the #1 mistake** when deploying Next.js + a separate API.

### 3.3 Create `Dockerfile.api` (project root)

```dockerfile
# Stage 1: dependencies (includes devDeps for the Prisma CLI)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: build + generate Prisma
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build:api

# Stage 3: runtime
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

### 3.4 Create `.dockerignore` (root) — fast builds and no secrets

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

### 3.5 `docker-compose.yml` (production — runs on the EC2; `db` MySQL in Docker = 100% free)

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

### 3.6 `Caddyfile` (place at the app root on the EC2) — auto HTTPS and routing

```
# A single domain: /api/* → api, everything else → web (same origin = simpler cookies)
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

> Caddy issues the Let's Encrypt certificate itself (free). The `handle` blocks route `/api/*` to the API and the pages to Next.js.

---

## 4. Provision the EC2 (Free Tier) — AWS console

1. **Console → EC2 → Launch instance**
   - **Name:** `villa-prod`
   - **AMI:** Ubuntu 22.04 LTS (HVM, 64-bit, arm/x86 ok)
   - **Instance type:** `t3.micro` (or `t2.micro`) — with the *"Free tier eligible"* badge
   - **Key pair:** create a new one `villa-prod` (.pem) — you'll use it for SSH
   - **Network settings → Edit:**
     - Security group name: `villa-prod-sg`
     - Inbound rules:
       | Type | Protocol | Port | Source |
       |------|----------|------|--------|
       | SSH | TCP | 22 | Your IP (e.g. `203.0.113.5/32`) |
       | HTTP | TCP | 80 | `0.0.0.0/0` |
       | HTTPS | TCP | 443 | `0.0.0.0/0` |
   - **Configure storage:** add **+10 GB** GP2 (on top of the 8 GB default) — ~18 GB total for the database + images. Stays within the 30 GB Free Tier.
   - **Launch.**

2. **Elastic IP (recommended — the IP doesn't change after reboot):**
   ```bash
   # Console: EC2 → Elastic IPs → Allocate (Free Tier) → Associate with the instance
   # Write down the public IP (e.g. 3.210.23.45)
   ```

3. **Point your DNS** (wherever your domain is) to the EC2:
   - **A** record: `@` → EC2 Public IP
   - **A** record: `www` → EC2 Public IP
   - (With Route 53: Hosted Zone → Record sets.)

4. **SSH to the instance:**
   ```bash
   chmod 400 villa-prod.pem
   ssh -i villa-prod.pem ubuntu@<EC2_PUBLIC_IP>
   ```

---

## 5. Configure the EC2 (Docker + folders + environment file)

Run **inside the instance** (via SSH):

```bash
# 5.1 Install Docker + Compose plugin
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

# 5.2 Apply the docker group (re-login, or:)
newgrp docker

# 5.3 Create the application folder
mkdir -p ~/app && cd ~/app

# 5.4 Create/edit the env file (NEVER commit this!)
nano .env
```

#### Contents of `~/app/.env` (replace the values with yours):

```bash
# Docker
DOMAIN=royalmansion.com                              # your domain
ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com   # account ID + region

# Database (MySQL) — strong passwords!
MYSQL_ROOT_PASSWORD=a_very_strong_root_password
MYSQL_PASSWORD=a_very_strong_app_password

# App
SESSION_SECRET=random_64_char_value
CRON_SECRET=random_64_char_value
MANAGE_BOOKING_TOKEN_SECRET=random_64_char_value
ICAL_FEED_SECRET=random_64_char_value
COOKIE_DOMAIN=royalmansion.com

# Initial admin (the seed uses ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)
ADMIN_SEED_EMAIL=owner@royalmansion.com
ADMIN_SEED_PASSWORD=strong_admin_password

# PayHere
PAYHERE_MODE=sandbox                    # switch to live after testing
PAYHERE_MERCHANT_ID=YOUR_MERCHANT_ID
PAYHERE_MERCHANT_SECRET=YOUR_MERCHANT_SECRET

# Email (Resend)
RESEND_API_KEY=your_resend_key
EMAIL_FROM="Royal Mansion <no-reply@royalmansion.com>"
ADMIN_NOTIFICATION_EMAIL=owner@royalmansion.com
```

```bash
# 5.5 Copy the deploy files you created in the repository:
#     Dockerfile.web, Dockerfile.api, docker-compose.yml, Caddyfile, .dockerignore
#     (Simplest: keep them in the repo and git clone / rsync)

# Example via rsync from your local machine:
rsync -avz -e "ssh -i villa-prod.pem" Dockerfile.web Dockerfile.api docker-compose.yml Caddyfile .dockerignore ubuntu@<IP>:/home/ubuntu/app/

# IMPORTANT:
# In docker-compose.yml, replace the literal ${DOMAIN} in the Caddyfile:
sed -i "s/\${DOMAIN}/royalmansion.com/g" Caddyfile

# 5.6 Bring up the stack (only db + caddy first, to avoid image-not-found issues)
docker compose --env-file .env up -d db
# wait a few seconds, then check:
docker compose --env-file .env ps
```

> **Note on `DATABASE_URL`:** in production we use `mysql://villa:...@db:3306/villa_booking` (the `db` service name in Compose). Prisma works with the default connection settings for MySQL.

---

## 6. Image Repository — Amazon ECR

The containers are built on **GitHub Actions** and pushed to **ECR**; the EC2 only does `docker pull`.

```bash
# 6.0 Define (replace with your values)
REGION=us-east-1
ACCOUNT_ID=123456789012        # your AWS account id

# 6.1 Create repositories
aws ecr create-repository --repository-name royal-api --region $REGION
aws ecr create-repository --repository-name royal-web --region $REGION

# 6.2 Login to ECR (needed for push)
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# 6.3 Build locally (test before automating)
docker build -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://royalmansion.com/api/v1 \
  -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/royal-web:latest .

docker build -f Dockerfile.api -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/royal-api:latest .

# 6.4 Push
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/royal-web:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/royal-api:latest
```

> From here on, you no longer need to build by hand — the GitHub Actions (section 7) does everything. On the EC2, deployment is just `docker compose pull && up`.

---

## 7. CI/CD — GitHub Actions

### 7.1 Required repository secrets (Settings → Secrets and variables → Actions)

| Secret | Example |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | from the `deploy` user |
| `AWS_SECRET_ACCESS_KEY` | same |
| `AWS_REGION` | `us-east-1` |
| `ECR_REGISTRY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `EC2_HOST` | `3.210.23.45` |
| `EC2_SSH_KEY` | contents of `villa-prod.pem` |
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

> **Flow:** push to `main` → run tests → build & push both images to ECR → SSH to the EC2 → `pull`, apply Prisma migrations, start the containers, and validate `/health`.

---

## 8. First Deploy, Migrations and Verification

### 8.1 Apply migrations (depends on MySQL being up)

```bash
cd ~/app
# (a) run migrations once (or let CI handle it)
docker compose --env-file .env run --rm api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# (b) optional seed (creates initial packages/rooms/admin)
docker compose --env-file .env run --rm api npx prisma db seed --schema=apps/api/prisma/schema.prisma
#   (if the seed is not configured in package.json, run: npx tsx apps/api/prisma/seed.ts)
```

### 8.2 Start the containers

```bash
docker compose --env-file .env up -d --remove-orphans
docker compose --env-file .env ps   # everything "running" and db "healthy"
```

### 8.3 Verify the health check

```bash
# From inside the EC2
docker compose --env-file .env exec api curl -s localhost:4000/health
# → {"ok":true}

# From outside (via Caddy/HTTPS — only after DNS propagates)
curl -s https://royalmansion.com/health
curl -sI https://royalmansion.com/          # HTTP/2 200
```

### 8.4 Quick browser tests

- [ ] Does `https://royalmansion.com` load the homepage?
- [ ] Does `/admin/login` let you log in with the admin seed?
- [ ] Create a test booking at `/booking` (PayHere sandbox).
- [ ] Does `https://royalmansion.com/api/v1/...` respond (public routes)?
- [ ] Did the confirmation email arrive (Resend)?

---

## 9. Monitoring and Alerts (CloudWatch + SNS)

### 9.1 Install the CloudWatch Agent on the EC2 (logs)

```bash
cd ~/app
# CloudWatch agent collects container logs (docker json-file → cloudwatch)
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

> The API already emits **structured JSON logs** (pino-http) and redacts `authorization`/`md5sig` — perfect for CloudWatch Logs Insights.

### 9.2 CPU/disk/error alerts (SNS + CloudWatch)

```bash
# 9.2.1 Create an SNS topic (Free Tier: 1M notifications/month)
aws sns create-topic --name villa-alerts

# 9.2.2 Subscribe your email (you'll get a confirmation email)
aws sns subscribe --topic-arn <TOPIC_ARN> --protocol email --notification-endpoint you@example.com

# 9.2.3 CPU > 80% alarm (5 min)
aws cloudwatch put-metric-alarm \
  --alarm-name villa-cpu-high \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --dimensions Name=InstanceId,Value=<EC2_INSTANCE_ID> \
  --period 300 --evaluation-periods 1 --statistic Average \
  --threshold 80 --comparison-operator GreaterThanThreshold \
  --alarm-actions <TOPIC_ARN>

# 9.2.4 Disk/status (EBS) alarm
aws cloudwatch put-metric-alarm \
  --alarm-name villa-disk-high \
  --metric-name StatusCheckFailed_System --namespace AWS/EC2 \
  --dimensions Name=InstanceId,Value=<EC2_INSTANCE_ID> \
  --period 300 --evaluation-periods 2 --statistic Maximum \
  --threshold 1 --comparison-operator GreaterThanThreshold \
  --alarm-actions <TOPIC_ARN>
```

### 9.3 One-minute dashboard

Create a **CloudWatch Dashboard** with: CPU, NetworkIn/Out, StatusChecks, and EBS metrics. Free within the 10 basic metrics.

---

## 10. Rollback (Safe Deployment Plan)

Since we work with the `latest` tag + Compose, rollback is fast:

```bash
cd ~/app
# 1) Push the previous version (from a previous commit) and re-tag:
#    docker tag <ECR>/royal-api:<previous-commit> <ECR>/royal-api:latest  (on the build machine)

# 2) On the EC2, simply redeploy the previous commit via GitHub Actions
#    OR (manual) revert the compose to an older image:
git checkout <PREVIOUS_COMMIT>
docker compose --env-file .env up -d --force-recreate
docker compose --env-file .env ps
```

**Practices that make rollback easy:**
- **Pin images by SHA/commit**, not just `latest`. In Compose use `royal-web:<git-sha>` and inject the SHA in CI. That way you always know exactly which version is live.
- **Database:** Prisma migrations are incremental and can be reversed manually. Before migrating in production, back up:
  ```bash
  docker compose --env-file .env exec db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" villa_booking > backup_$(date +%F).sql
  ```
- **Daily backups** to S3 (free tier 5 GB) via `mysqldump` + `aws s3 cp` (cron / `crontab -e`).

---

## 11. Production Checklist (before launch)

- [ ] Environment variables via a `.env` file on the EC2 or **SSM Parameter Store** (never in the repository / `git`).
- [ ] `/health` responding (200) and monitored.
- [ ] Structured logs (JSON) with `request_id` (the API already uses pino; enable `response.requestId` if desired).
- [ ] Rate limiting configured — **already active** in the API: `rateLimit 120 req/min` + `trust proxy`.
- [ ] CORS restricted to the domain (`FRONTEND_URL` = `https://royalmansion.com`). Already configured.
- [ ] MySQL with **automatic backup** (RDS: snapshots; Docker: a `mysqldump` cron + S3).
- [ ] Container/API with a proper **timeout** (`express` default is fine; Caddy `reverse_proxy { flush_interval ... }` if needed).
- [ ] CloudWatch alarms for **errors and latency** (section 9).
- [ ] Rollback plan documented (section 10).
- [ ] **Load test** before launch (e.g. `k6`/`hey` — `hey -z 30s https://royalmansion.com/`).
- [ ] PayHere in **live** with `PAYHERE_MODE=live` and notify URLs pointing to the real HTTPS.
- [ ] `NODE_ENV=production` and the correct `NEXT_PUBLIC_API_BASE_URL` in the build.
- [ ] Security: security group opens SSH 22 only to your IP; 80/443 open.

---

## 12. Troubleshooting & Common Errors

| Symptom | Likely cause | Solution |
|---------|--------------|----------|
| Site opens but API is `localhost` | `NEXT_PUBLIC_API_BASE_URL` not passed at build | Rebuild web with `--build-arg NEXT_PUBLIC_API_BASE_URL=https://domain/api/v1` |
| `400 invalid environment` in the API | missing required variable (e.g. `DATABASE_URL`, `SESSION_SECRET`) | Check the EC2 `.env` and the Compose `environment:` block |
| Prisma `P1001 can't reach database` | MySQL not ready / wrong URL | Wait for `service_healthy`; check `docker compose ps db`; use host `db` |
| CORS blocked in admin | wrong `FRONTEND_URL` / `COOKIE_DOMAIN` | Use the API and frontend on the **same origin** and `FRONTEND_URL=https://domain` |
| Admin login fails / cookie disappears | wrong `COOKIE_DOMAIN` or HTTP | Keep `COOKIE_DOMAIN=domain` (no `http://`); HTTPS only |
| `502 Bad Gateway` on Caddy | web/api still starting | `docker compose logs -f web api caddy`; wait for health |
| Certificate not issued | DNS hasn't propagated / port 80 closed | `dig +short domain` = EC2 IP; open 80/443 in the SG |
| PayHere notify 404 | notify URL points to the wrong subpath | `PAYHERE_NOTIFY_URL=https://domain/api/v1/payments/payhere/notify` |
| Email not sending | invalid Resend key/domain | Validate `RESEND_API_KEY` and the verified domain in Resend |
| EC2 very slow (t3 micro) | low RAM (1 GB) | Don't build on the EC2; build only in CI; limit Node with `NODE_OPTIONS=--max-old-space-size=256` if needed |

### 12.1 Useful logs

```bash
docker compose --env-file .env logs -f api        # API (JSON)
docker compose --env-file .env logs -f web        # Next
docker compose --env-file .env logs -f caddy      # proxy/TLS
docker compose --env-file .env logs -f db         # MySQL
docker compose --env-file .env top                # CPU/RAM usage
```

---

## 13. Alternatives and Additional Recommendations

### 13.1 Use RDS MySQL (Free Tier) instead of MySQL in Docker

If you want a **managed** database (automatic backup, failover, upgrades):

```bash
# Create an RDS MySQL db.t3.micro instance (free tier badge)
aws rds create-db-instance \
  --db-instance-identifier villa-db \
  --engine mysql --db-instance-class db.t3.micro \
  --allocated-storage 20 --storage-type gp3 \
  --master-username villa --master-user-password 'VeryStrong!1Password' \
  --db-name villa_booking --publicly-accessible false \
  --vpc-security-group-ids sg-xxxxxxxx --multi-az false
```

- Put the EC2 and RDS in the **same VPC** (the EC2 reaches RDS through the private endpoint, no need to expose it to the internet).
- In Compose, change `DATABASE_URL` to `mysql://villa:PASSWORD@<RDS_ENDPOINT>:3306/villa_booking` and **remove the `db` service** (only API/web/caddy remain).
- RDS has automatic backup included — safer than manual mysqldump.

### 13.2 Global front with CloudFront + ACM (optional, also free)

If you want a CDN in future versions:
1. **ACM** → request a public certificate for `royalmansion.com` and `*.royalmansion.com` (DNS validation).
2. **CloudFront** → a Distribution with origin = EC2 (or IP), with a default behavior that passes `/api/*` through unchanged.
3. Point the domain alias/`CNAME` at the Distribution.

> For **Next.js SSR** this requires careful caching (don't cache authenticated pages). Start without CloudFront; add it later.

### 13.3 Without your own domain (testing only)

- Use the public IP directly with Caddy: `curl http://<EC2>` already responds.
- Caddy supports **local HTTPS** via `tls internal` (without a public domain):
  ```
  :443 {
      tls internal
      handle /api/* { reverse_proxy api:4000 }
      handle { reverse_proxy web:3000 }
  }
  ```
  (The browser will warn about the self-signed certificate — fine for internal testing.)

---

## 14. Quick Command Reference

| Action | Command |
|--------|---------|
| Build web (local) | `docker build -f Dockerfile.web --build-arg NEXT_PUBLIC_API_BASE_URL=https://DOMAIN/api/v1 -t royal-web .` |
| Build api (local) | `docker build -f Dockerfile.api -t royal-api .` |
| Push images | `docker push <ECR>/royal-web:latest` and `.../royal-api:latest` |
| Inspect stack on EC2 | `docker compose --env-file .env ps` |
| Logs | `docker compose --env-file .env logs -f api` |
| Migrations | `docker compose --env-file .env run --rm api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma` |
| Manual deploy | `docker compose --env-file .env pull && docker compose --env-file .env up -d --force-recreate` |
| Health | `curl -s https://DOMAIN/health` |
| DB backup | `docker compose --env-file .env exec db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" villa_booking > backup.sql` |
| Rollback | rebuild the previous image (section 10) |
| Delete stack | `docker compose --env-file .env down -v` (deletes volumes! be careful) |

---

## 15. Security Hardening

- **Never commit secrets.** Is `.env` in your `.gitignore`? Check it. Use **SSM Parameter Store** (free, standard tier) for keys instead of files, if you prefer:
  ```bash
  aws ssm put-parameter --name "/villa/PayHereSecret" --type SecureString --value "..." --overwrite
  ```
- **Rotate** `SESSION_SECRET`/`CRON_SECRET`/`MANAGE_BOOKING_TOKEN_SECRET`/`ICAL_FEED_SECRET` periodically.
- **Minimize IAM**: the `deploy` user should not have access to other accounts/unnecessary services.
- Keep the base image up to date (`node:20-alpine`) and run `npm audit` in CI.
- `docker compose` with `restart: unless-stopped` + healthchecks = automatic crash recovery.
- Keep the SSH security group restricted **to your IP**.

---

## Roadmap (execution order)

1. Change `next.config.js` → `output: "standalone"`.
2. Create `Dockerfile.web`, `Dockerfile.api`, `.dockerignore`, `docker-compose.yml`, `Caddyfile`.
3. In AWS: IAM `deploy` user + GitHub keys.
4. Create the **EC2 t3.micro** (+ EBS), Elastic IP, SG (22/80/443), point DNS.
5. Install Docker on the EC2; create `~/app/.env` and copy the files.
6. Create the **ECR** repositories (`royal-api`, `royal-web`).
7. Add the `deploy.yml` workflow and the **secrets** to GitHub; push to `main`.
8. Watch the pipeline; check migrations + containers + `/health`.
9. Configure **CloudWatch + SNS** and the **daily backup**.
10. Run the **production checklist** (section 11) and leave PayHere sandbox.

---

*This guide uses AWS Free Tier (EC2 + ECR + CloudWatch + SNS + optional RDS/CloudFront). Costs beyond the free tier: domain, Route 53 (if used), ECR storage (>1GB), CloudWatch Logs above 5GB, and EC2 egress above 100GB/month.*








