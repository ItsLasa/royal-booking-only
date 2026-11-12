# Deploy Royal Mansion Resort to AWS EC2 — Beginner Steps

This guide walks you through deploying this project (Next.js frontend + Express API + MySQL)
onto a single AWS EC2 server, step by step, for beginners. You only need an **AWS account**
and (optionally) a **domain name**.

> **What you'll end up with:**
> - The website (Next.js) running on port **3000**
> - The API (Express + Prisma) running on port **4000**
> - MySQL database on the same server
> - **Nginx** as a "front door" that lets people reach your site on port **80** (HTTP)
> - **PM2** keeps everything running and restarts it after a reboot

---

## 0. Before you start — what you need

- An [AWS account](https://aws.amazon.com/) (the free tier is enough).
- A computer with SSH. On **Windows 10/11** you already have `ssh` built in (OpenSSH).
- Optional but recommended: a **domain name** (e.g. `yourvilla.com`) for HTTPS.
- This project's code pushed to a **GitHub repository** (so the server can download it).
  If you don't have it on GitHub yet, do this first:

```bash
git add .
git commit -m "initial"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/royal-mansion.git
git push -u origin main
```

---

## 1. Create the EC2 instance

1. Log in to the **AWS Console** → search for **EC2** → click **Instances** → **Launch instance**.
2. **Name**: `royal-villa-server`
3. **Application and OS Images**: choose **Ubuntu Server 24.04 LTS** (HVM, 64-bit x86).
   - (Ubuntu uses `apt`, which is very beginner friendly. Amazon Linux works too but uses `dnf`.)
4. **Instance type**: `t2.micro` or `t3.micro` (both are free-tier eligible).
5. **Key pair (login)**:
   - Click **Create new key pair**.
   - Name it `villa-key`, type **RSA**, format **.pem**.
   - Download the `villa-key.pem` file — **save it somewhere safe, you need it to log in.** You can't re-download it later.
6. **Network settings → Edit**:
   - Make sure **Allow SSH traffic from**: `My IP` (only your IP, safer).
   - **Allow HTTP traffic from the Internet**: ✓ (check the box)
   - **Allow HTTPS traffic from the Internet**: ✓ (check the box)
   - (Create a new security group; the default is fine.)
7. **Configure storage**: keep the default 8 GB, or bump it to **20 GB** to be safe.
8. Click **Launch instance**, then click the instance ID / **View all instances**.
9. Wait for the **Instance state** to become `Running`.


---

## 2. Connect to your server (SSH)

You need your server's **Public IPv4 address** (copy it from the Instances list).

### On Windows (PowerShell / Command Prompt / Terminal):

```powershell
cd C:\path\to\where\you\saved\villa-key.pem
ssh -i villa-key.pem ubuntu@YOUR_SERVER_PUBLIC_IP
```

- Replace `YOUR_SERVER_PUBLIC_IP` with your real IP.
- On Windows you may get a permission error. Fix it once:
  ```powershell
  icacls villa-key.pem /inheritance:r
  icacls villa-key.pem /grant:r "$($env:USERNAME):(R)"
  ```
  Then run the `ssh` command again.
- First time it asks `Are you sure you want to continue connecting?` — type `yes`.

### On macOS / Linux:

```bash
chmod 400 ~/path/to/villa-key.pem
ssh -i ~/path/to/villa-key.pem ubuntu@YOUR_SERVER_PUBLIC_IP
```

You're now "inside" your server. Every command below runs **on the server**, unless it says otherwise.

---

## 3. Update the server & install the tools

Run these one at a time:

```bash
sudo apt update
sudo apt upgrade -y
```

### Install Node.js (version 20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
node -v
npm -v
```

You should see a Node version like `v20.x.x`.

### Install MySQL (the database)

```bash
sudo apt install -y mysql-server

---

## 4. Set up the MySQL database

Create a database and a user for the app:

```bash
sudo mysql
```

You are now inside the MySQL prompt (it starts with `mysql> `). Run:

```sql
CREATE DATABASE villa_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'villa'@'localhost' IDENTIFIED BY 'A_Strong_Password_123!';
GRANT ALL PRIVILEGES ON villa_booking.* TO 'villa'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> Write down the password you chose — you'll need it in Step 6.

---

## 5. Get the project code onto the server

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/royal-mansion.git royal-mansion
cd royal-mansion
npm install
```

Wait for `npm install` to finish (it can take a few minutes).

Run the Prisma client generation (creates the database client code):

```bash
npx prisma generate --schema apps/api/prisma/schema.prisma
```

---

## 6. Create the `.env` file (configuration)

The app reads a file called `.env` in the project's root folder. Let's create one:

```bash
cd ~/royal-mansion
cp .env .env.backup    # keep a backup of the example/dev file
nano .env
```

`nano` is a simple text editor:
- **Edit** with the arrow keys.
- **Save**: press `Ctrl + O`, then `Enter`.
- **Exit**: press `Ctrl + X`.

Replace the values with **your production values**. The most important ones:

```
NODE_ENV=production
FRONTEND_URL=http://YOUR_SERVER_PUBLIC_IP
API_URL=http://YOUR_SERVER_PUBLIC_IP/api
PORT=4000
DATABASE_URL=mysql://villa:A_Strong_Password_123!@localhost:3306/villa_booking
SESSION_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING
COOKIE_DOMAIN=
ADMIN_SEED_EMAIL=owner@yourdomain.com
ADMIN_SEED_PASSWORD=Pick_A_Strong_Admin_Password!
PROPERTY_TIMEZONE=Asia/Colombo
DEFAULT_CURRENCY=LKR
PAYHERE_MODE=sandbox
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_MERCHANT_SECRET=your_merchant_secret
CRON_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING
BOOKING_HOLD_MINUTES=15
MANAGE_BOOKING_TOKEN_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING
ICAL_FEED_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING
NEXT_PUBLIC_API_BASE_URL=http://YOUR_SERVER_PUBLIC_IP/api/v1
```

**How to make a long random string:**

```bash
openssl rand -hex 32
```

Run it a few times and paste the results into `SESSION_SECRET`, `CRON_SECRET`,
`MANAGE_BOOKING_TOKEN_SECRET`, and `ICAL_FEED_SECRET`.

> ⚠️ **IMPORTANT — `NEXT_PUBLIC_API_BASE_URL`**
> This value is "baked into" the website when it is *built*. It must point to where the API
> will live. Because Nginx (Step 10) will forward anything starting with `/api` to your API,
> we set it to `http://YOUR_SERVER_PUBLIC_IP/api/v1`.
> **If you don't set this correctly, the site will try to call `localhost:4000` and fail.**

Leave `PAYHERE_MODE=sandbox` for now — you can switch to `live` later once real HTTPS is working.

sudo systemctl start mysql
sudo systemctl enable mysql
sudo systemctl status mysql    # press q to exit
```

### Install PM2 (keeps apps running)

```bash
sudo npm install -g pm2
```

### Install Nginx (the web server / front door)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

---

## 7. Set up the database tables & admin account

```bash
cd ~/royal-mansion
npm run db:migrate
```

This creates all the database tables from the schema.

Then **seed** the database (creates the default admin/owner account):

```bash
npm run db:seed
```

The admin logs in with the `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` you set in `.env`.

---

## 8. Build the website and the API

Now build the production files:

```bash
cd ~/royal-mansion
npm run build
```

This runs `npm run build:web` (Next.js) and `npm run build:api` (TypeScript → JS in `apps/api/dist`).

**If the build fails**, the two most common causes are:
- A `.env` value is wrong (e.g. bad `DATABASE_URL`, missing `NEXT_PUBLIC_API_BASE_URL`).
- Memory too low on a tiny instance. If you see a build crash, add swap memory (Step 8.1 below), then rebuild.

### 8.1 (Only if build runs out of memory)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Then run `npm run build` again.

---

## 9. Start the site & API with PM2

PM2 starts your apps and keeps them alive. Start them:

```bash
cd ~/royal-mansion

# Start the Next.js frontend on port 3000
pm2 start npm --name "web" -- start

# Start the Express API on port 4000 (the compiled version)
pm2 start node --name "api" -- apps/api/dist/server.js
```

**Check they are running:**

```bash
pm2 status
```

Both should show `online`. You should see `web` and `api`.

**Make PM2 restart them automatically if the server reboots:**

```bash
pm2 save
pm2 startup
```

PM2 will print a `sudo env PATH=... pm2 startup ...` command — copy that whole line, paste it,
and press Enter. Then run `pm2 save` again.

**Quick sanity check on the server itself:**

```bash
curl http://localhost:3000        # should return the website HTML
curl http://localhost:4000/health # should return {"ok":true}
```


---

## 10. Point Nginx to your site (reverse proxy)

Nginx is what actually talks to the internet and forwards requests to your apps.

```bash
sudo nano /etc/nginx/sites-available/royalmansion
```

Paste this (replace `YOUR_SERVER_PUBLIC_IP` — if you have a domain, put the domain here instead):

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_PUBLIC_IP;   # or your domain, e.g. yourvilla.com

    # Forward normal web traffic to the Next.js app (port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Forward anything starting with /api to the Express API (port 4000)
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

Now enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/royalmansion /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t          # must say "syntax is ok" and "test is successful"
sudo systemctl reload nginx
```

**Now open a browser on your own computer and go to:**

```
http://YOUR_SERVER_PUBLIC_IP
```

You should see the Royal Mansion website! ✅


---

## 11. (Recommended) Add HTTPS with a free certificate

Only works if you have a **domain name** pointing to your server's IP
(add an **A record** in your domain's DNS: `@` and `www` → `YOUR_SERVER_PUBLIC_IP`).

Run on the server:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourvilla.com -d www.yourvilla.com
```

Follow the prompts (enter your email, agree, choose to redirect HTTP→HTTPS).
Certbot automatically updates your Nginx config to use HTTPS and renews the certificate.

**After HTTPS is working, update your `.env`:**

```bash
cd ~/royal-mansion
nano .env
```

Change:
- `FRONTEND_URL` → `https://yourvilla.com`
- `API_URL` → `https://yourvilla.com/api`
- `NEXT_PUBLIC_API_BASE_URL` → `https://yourvilla.com/api/v1`
- `PAYHERE_RETURN_URL` → `https://yourvilla.com/book/success`
- `PAYHERE_CANCEL_URL` → `https://yourvilla.com/book/cancelled`

> ⚠️ Because `NEXT_PUBLIC_API_BASE_URL` is baked in at build time, after changing it you must
> **rebuild the website** (Step 12).

---

## 12. Rebuild & restart after any change

Any time you change `.env` or pull new code, refresh the running apps:

```bash
cd ~/royal-mansion
git pull origin main          # if you pushed new code
npm install                    # if dependencies changed
npm run build                 # rebuilds web + api (needed for NEXT_PUBLIC_* changes)
pm2 restart all
pm2 save
```

---

## 13. Keep it alive & healthy

```bash
pm2 status          # see if web and api are online
pm2 logs web        # watch the website logs (Ctrl+C to exit)
pm2 logs api        # watch the API logs
```

If a `.env` change breaks the API, you'll see errors in `pm2 logs api`.

**Database backup (run regularly):**

```bash
mysqldump -u villa -p villa_booking > villa_backup_$(date +%F).sql
```

---

## 14. Common problems & fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Site loads but shows `localhost` / API calls fail | `NEXT_PUBLIC_API_BASE_URL` not set at build time | Set it in `.env`, then `npm run build` + `pm2 restart all` |
| API shows `400 invalid environment` | Missing required `.env` value (e.g. `DATABASE_URL`) | Check `.env`, restart api: `pm2 restart api` |
| Prisma `P1001 can't reach database` | MySQL not running or wrong URL | `sudo systemctl start mysql`; check `DATABASE_URL` |
| Browser shows "connection refused" on port 80 | Nginx not running or security group blocks HTTP | `sudo systemctl start nginx`; check EC2 security group allows HTTP (80) |
| Can't SSH in | `.pem` permissions or wrong IP/key | Fix permissions (Step 2); check you use the right key and IP |
| Build crashes / runs out of memory | Tiny instance + no swap | Do Step 8.1 (add swap), then rebuild |
| Can't log in to admin | Login page + `/admin/login` | Check `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` in `.env`, re-run `npm run db:seed` |

---

## 15. Next steps & hardening (do these once it works)

- [ ] **Change `PAYHERE_MODE` to `live`** and set real merchant credentials + real notify URLs (see `PAYHERE_SETUP.md`).
- [ ] Use **strong, unique random secrets** in `.env` (never the example values).
- [ ] Consider using **RDS (managed MySQL)** instead of a local database for better backups/reliability.
- [ ] Point your **domain** at the server and enable HTTPS (Step 11).
- [ ] Set up an **automated CI/CD pipeline** (see `guide-devops.en.md` for a GitHub Actions + Docker setup).
- [ ] Back up the database daily.

That's it — your Royal Mansion Resort is now live on AWS EC2! 🎉

