# cPanel Node.js & MySQL Hosting Guide (No Prisma Migrations Needed)

This guide walks you step-by-step through hosting the **Royal Mansion Resort & Villa Booking Engine** on any standard cPanel hosting environment using **cPanel's native MySQL (phpMyAdmin)** and the **"Setup Node.js App"** (CloudLinux Phusion Passenger) feature.

---

## 📋 Why We Avoid Prisma CLI on cPanel

On standard cPanel shared hosting:
1. `prisma migrate dev` requires creating a temporary "shadow database" and requires `GRANT CREATE DATABASE` privileges, which cPanel MySQL users do not have.
2. Prisma CLI binaries often fail on Linux shared hosting due to GLIBC version differences or read-only filesystem restrictions.
3. **The Solution:** We provide a pure, 100% complete MySQL SQL script (`cpanel_database_setup.sql`) that you can directly import in **phpMyAdmin** with 1 click!

---

## Step 1: Create a MySQL Database in cPanel

1. Log in to your **cPanel**.
2. Under the **Databases** section, click **MySQL® Database Wizard** (or **MySQL® Databases**).
3. **Create a Database:**
   - Database Name: e.g., `royalmansion` (cPanel will prefix this with your username, e.g., `yourcpaneluser_royalmansion`).
   - Click **Next Step**.
4. **Create Database User:**
   - Username: e.g., `dbadmin` (full name will be `yourcpaneluser_dbadmin`).
   - Password: Generate a strong password (e.g. `MySecurePass!2026`).
   - Click **Create User**.
5. **Assign Privileges:**
   - Check the box **ALL PRIVILEGES**.
   - Click **Make Changes**.

---

## Step 2: Import the SQL Schema & Seed Data in phpMyAdmin

1. In cPanel, click **phpMyAdmin**.
2. In the left sidebar, click on your newly created database (e.g., `yourcpaneluser_royalmansion`).
3. Click the **Import** tab at the top.
4. Click **Choose File** and select [`cpanel_database_setup.sql`](./cpanel_database_setup.sql) from this project.
5. Leave format as **SQL** and click **Import** (or **Go**).
6. phpMyAdmin will execute the script and display a green success notification:
   - All 25 tables will be created (`Property`, `Unit`, `Package`, `AdminUser`, `Booking`, etc.).
   - Initial sample seed data (Villa, Suites, Packages, Amenities, Add-ons, and Owner Admin account) will be populated automatically!

### 🔑 Default Admin Account Created:
- **Email:** `owner@royalmansion.lk`
- **Password:** `ChangeMe123!`
- **Role:** `OWNER`

---

## Step 3: Configure Environment Variables (`.env`)

In your project directory on cPanel (or create a file named `.env` in the API root):

```dotenv
NODE_ENV=production
PORT=4000

# Front-end & API Domain
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1

# cPanel MySQL Database URL (Use 127.0.0.1 or localhost)
# Format: mysql://<CPANEL_USER>_<DB_USER>:<PASSWORD>@localhost:3306/<CPANEL_USER>_<DB_NAME>
DATABASE_URL="mysql://yourcpaneluser_dbadmin:MySecurePass!2026@localhost:3306/yourcpaneluser_royalmansion"

# Security Secrets (Generate 32+ character random strings)
SESSION_SECRET="e9b251e6b3604f8bb64b5894172f854198305c6bf754041b312a02b1db"
CRON_SECRET="f3c09b11d54238e55e09f7a77d5b1e428a4c84918f62c072e5"
MANAGE_BOOKING_TOKEN_SECRET="4a7e9375e243444eb1c4be8f75b11293a1cf5525"
ICAL_FEED_SECRET="c20188bb3e970b50325418b6e22f28b4920b784a"

PROPERTY_TIMEZONE="Asia/Colombo"
DEFAULT_CURRENCY="LKR"
BOOKING_HOLD_MINUTES=15

# Payment Gateway (PayHere Sri Lanka)
PAYHERE_MODE=sandbox
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
PAYHERE_NOTIFY_URL=https://api.yourdomain.com/api/v1/payments/payhere/notify
PAYHERE_RETURN_URL=https://yourdomain.com/booking/success
PAYHERE_CANCEL_URL=https://yourdomain.com/booking/cancel
```

---

## Step 4: Setup the Node.js API in cPanel

1. In cPanel, navigate to the **Software** section and click **Setup Node.js App**.
2. Click **Create Application**.
3. Fill in the application settings:
   - **Node.js version:** Choose **Node.js 18.x, 20.x, or 22.x**.
   - **Application mode:** `Production`.
   - **Application root:** Path where your API is located (e.g. `api` or `royalmansion`).
   - **Application startup file:** `app.js` *(we created this file in the project root!)*.
   - **Application URL:** Select your subdomain (e.g., `api.yourdomain.com`).
4. Click **Create**.
5. Click **Stop App** while uploading files or installing packages.

---

## Step 5: Upload Files & Deploy (1-Click Zip Package)

We have created an automated packaging script that compiles both the backend API and Next.js frontend, creating an optimized deployment archive `cpanel_deploy.zip`:

### 🚀 Recommended: 1-Click Package Deployment
1. On your development machine, run:
   ```bash
   npm run package:cpanel
   ```
   This generates `cpanel_deploy.zip` (~30 MB) containing:
   - `app.js` (hardened cPanel entry point)
   - `.next/` and `next_build/` (pre-compiled production frontend with `BUILD_ID`)
   - `apps/api/dist/` (compiled Express API server)
   - `public/` (all images & static assets)
   - `package.json`, `.htaccess`, and `cpanel_database_setup.sql`

2. In cPanel **File Manager**:
   - Open your Application Root directory (e.g., `public_html` or `royalmansion`).
   - Click **Upload** and select `cpanel_deploy.zip`.
   - Right-click `cpanel_deploy.zip` and select **Extract**.
   
3. In cPanel **Setup Node.js App**:
   - Click **Run NPM Install** (or run `npm install --omit=dev` in terminal).
   - Click **Restart App**.
   - Open your website: Your booking engine and full resort website will load live!

---

## Step 6: Frontend Deployment on cPanel

You have two simple options for hosting the Next.js frontend:

### Method 1: Host Frontend via cPanel `public_html` (Static Export)
1. In `next.config.js`, set:
   ```js
   const nextConfig = {
     output: 'export',
     images: { unoptimized: true },
   };
   module.exports = nextConfig;
   ```
2. Run:
   ```bash
   npm run build:web
   ```
   This generates an `out/` folder containing static HTML, JS, and CSS.
3. Upload the contents of the `out/` folder directly to your cPanel `public_html` directory!
4. The website will load with zero server latency directly from Apache/LiteSpeed, connecting to your API at `https://api.yourdomain.com/api/v1`.

### Method 2: Host Frontend as a Second Node.js App in cPanel
1. In cPanel **Setup Node.js App**, click **Create Application**.
2. Set Application root to `/` (or `web`), domain to `yourdomain.com`.
3. Startup file: `node_modules/next/dist/bin/next` with argument `start`.

---

## Step 7: Testing the Deployment

1. **Test API Health:**
   Visit: `https://api.yourdomain.com/health`
   Should return:
   ```json
   { "ok": true }
   ```
2. **Test Public Packages Endpoint:**
   Visit: `https://api.yourdomain.com/api/v1/packages`
   Should return the 3 seeded packages (`Full Villa Stay`, `Family Weekend Package`, etc.).
3. **Log In to Admin Console:**
   Visit: `https://yourdomain.com/admin/login`
   - Email: `owner@royalmansion.lk`
   - Password: `ChangeMe123!`

---

## 🛠️ Verification & Troubleshooting Checklist

| Issue | Cause | Fix |
|---|---|---|
| `Access denied for user` | Wrong MySQL user or password | Check cPanel prefix in `DATABASE_URL` (e.g. `username_user`) and verify password. |
| `Cannot find module './apps/api/dist/server.js'` | API not compiled | Run `npm run build:api` to compile TypeScript to JavaScript. |
| `503 Service Unavailable` | Node.js app stopped or crashed | Check cPanel `stderr.log` in the application root directory. |
| `CORS Error` on frontend | `FRONTEND_URL` mismatch in `.env` | Ensure `FRONTEND_URL=https://yourdomain.com` matches your exact frontend URL without trailing slash. |
| `Prisma Client Engine error` | Linux GLIBC binary target missing | The `schema.prisma` has been updated with `rhel-openssl` and `debian-openssl` Linux binary targets. |
| `ZodError: SESSION_SECRET / CRON_SECRET` | `.env` not loaded or secrets empty in production | `app.js` and `env.ts` now auto-load `.env` from all locations and automatically generate secure 64-character random secrets if missing. You can also explicitly set `SESSION_SECRET` and `CRON_SECRET` in cPanel Node.js App environment variables. |
| `Next.js build worker exited with signal: SIGKILL` | Container RAM limit exceeded during `next build` | The build pipeline is now optimized for low-memory environments (`cpus: 1`, `workerThreads: false`). If your cPanel host has strict memory (<1GB), add environment variable `SERVER_ONLY=true` in cPanel Node.js App UI to build only the backend API server. |
