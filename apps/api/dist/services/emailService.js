"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultFromEmail = getDefaultFromEmail;
exports.getEmailTransporter = getEmailTransporter;
exports.verifyEmailTransport = verifyEmailTransport;
exports.sendEmail = sendEmail;
exports.sendBookingSummaryEmail = sendBookingSummaryEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
let cachedTransporter = null;
/**
 * Resolve the sender address for emails sent by Nodemailer.
 */
function getDefaultFromEmail() {
    if (env_1.env.EMAIL_FROM && !env_1.env.EMAIL_FROM.includes("resend.dev") && !env_1.env.EMAIL_FROM.includes("localhost")) {
        return env_1.env.EMAIL_FROM;
    }
    if (env_1.env.SMTP_USER && env_1.env.SMTP_USER.includes("@")) {
        return `Royal Mansion Resort <${env_1.env.SMTP_USER}>`;
    }
    return "Royal Mansion Resort <info.royalmationresort@gmail.com>";
}
/**
 * Create or return a cached Nodemailer SMTP transporter.
 * Returns null if SMTP configuration is not provided.
 */
function getEmailTransporter() {
    if (cachedTransporter) {
        return cachedTransporter;
    }
    const hasConfig = Boolean(env_1.env.SMTP_USER && env_1.env.SMTP_PASS && (env_1.env.SMTP_HOST || env_1.env.SMTP_SERVICE));
    if (!hasConfig) {
        return null;
    }
    const transportOptions = {
        auth: {
            user: env_1.env.SMTP_USER,
            pass: env_1.env.SMTP_PASS,
        },
    };
    if (env_1.env.SMTP_SERVICE) {
        transportOptions.service = env_1.env.SMTP_SERVICE;
    }
    else if (env_1.env.SMTP_HOST) {
        transportOptions.host = env_1.env.SMTP_HOST;
        transportOptions.port = env_1.env.SMTP_PORT || 587;
        transportOptions.secure = env_1.env.SMTP_SECURE || env_1.env.SMTP_PORT === 465;
    }
    if (env_1.env.NODE_ENV !== "production") {
        transportOptions.tls = { rejectUnauthorized: false };
    }
    try {
        cachedTransporter = nodemailer_1.default.createTransport(transportOptions);
        return cachedTransporter;
    }
    catch (err) {
        console.error("❌ [email-nodemailer] Failed to initialize Nodemailer transporter:", err);
        return null;
    }
}
/**
 * Verify SMTP transport connection (useful for health checks & debugging).
 */
async function verifyEmailTransport() {
    const transporter = getEmailTransporter();
    if (!transporter) {
        console.warn("⚠️ [email-nodemailer] Cannot verify: SMTP transporter is not configured.");
        return false;
    }
    try {
        await transporter.verify();
        console.log("✅ [email-nodemailer] SMTP transport connection verified successfully.");
        return true;
    }
    catch (err) {
        console.error("❌ [email-nodemailer] SMTP verification failed:", err);
        return false;
    }
}
/**
 * Generic helper to send an email using Nodemailer.
 */
async function sendEmail(options) {
    const from = options.from || getDefaultFromEmail();
    const transporter = getEmailTransporter();
    // Always write backup to disk
    try {
        const emailLogDir = path_1.default.resolve(process.cwd(), "logs/emails");
        if (!fs_1.default.existsSync(emailLogDir))
            fs_1.default.mkdirSync(emailLogDir, { recursive: true });
        const emailFile = path_1.default.join(emailLogDir, `mail_${Date.now()}.html`);
        fs_1.default.writeFileSync(emailFile, options.html, "utf-8");
    }
    catch {
        // Ignore log dir write errors
    }
    if (!transporter) {
        console.warn(`ℹ️ [email-nodemailer] SMTP not configured. Skipped sending to ${options.to}. Subject: ${options.subject}`);
        return { sent: false, error: "SMTP not configured" };
    }
    try {
        const info = await transporter.sendMail({
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });
        console.log(`✅ [email-nodemailer] Mail delivered to ${options.to} (ID: ${info.messageId})`);
        return { sent: true, messageId: info.messageId };
    }
    catch (err) {
        console.error(`❌ [email-nodemailer] Failed sending email to ${options.to}:`, err);
        return { sent: false, error: err?.message || String(err) };
    }
}
/**
 * Send complete booking summary and confirmation email to guest and admin alert via Nodemailer.
 */
async function sendBookingSummaryEmail(prisma, bookingIdOrRef) {
    try {
        const booking = await prisma.booking.findFirst({
            where: {
                OR: [{ id: bookingIdOrRef }, { reference: bookingIdOrRef }],
            },
            include: {
                guest: true,
                package: true,
                priceLines: true,
                addOns: true,
                payments: true,
            },
        });
        if (!booking || !booking.guest?.email) {
            console.warn(`[email-nodemailer] Booking or guest email not found for ${bookingIdOrRef}`);
            return false;
        }
        const checkIn = new Date(booking.checkInDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
        const checkOut = new Date(booking.checkOutDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
        const lkr = (val) => `LKR ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const guestNameRaw = `${booking.guest.firstName} ${booking.guest.lastName}`.trim();
        const guestName = escapeHtml(guestNameRaw);
        const guestEmailRaw = booking.guest.email;
        const guestEmail = escapeHtml(guestEmailRaw);
        const guestPhone = escapeHtml(booking.guest.phone);
        const guestCountry = escapeHtml(booking.guest.country);
        const specialRequests = escapeHtml(booking.specialRequests);
        const packageName = escapeHtml(booking.package?.name ?? "Royal Mansion Villa Package");
        const safeRef = escapeHtml(booking.reference);
        const fromEmail = getDefaultFromEmail();
        const subject = `Booking Summary & Confirmation - ${booking.reference} | Royal Mansion Resort Villa`;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 20px; color: #1a1c1c; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background-color: #061b0e; color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; }
    .header p { margin: 0; color: #d0e9d4; font-size: 14px; }
    .badge { display: inline-block; background: #cba72f; color: #061b0e; font-weight: bold; padding: 6px 14px; border-radius: 20px; font-size: 13px; margin-top: 16px; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #061b0e; }
    .intro { font-size: 15px; line-height: 1.6; color: #4a5568; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #735c00; margin-bottom: 14px; }
    .table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .table td { padding: 8px 0; border-bottom: 1px solid #edf2f7; }
    .table td:first-child { color: #718096; width: 45%; }
    .table td:last-child { font-weight: 600; color: #1a202c; text-align: right; }
    .price-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; }
    .price-table td { padding: 8px 0; border-bottom: 1px solid #edf2f7; }
    .price-table .total-row td { border-top: 2px solid #061b0e; border-bottom: none; font-size: 16px; font-weight: bold; color: #061b0e; padding-top: 12px; }
    .price-table .deposit-row td { color: #735c00; font-weight: 600; }
    .notice { background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; margin-bottom: 24px; font-size: 14px; color: #065f46; border-radius: 0 4px 4px 0; }
    .footer { background: #f1f5f9; padding: 24px; text-align: center; font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; }
    .footer a { color: #061b0e; text-decoration: underline; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Royal Mansion Resort Villa</h1>
      <p>Pussallawa, Sri Lanka</p>
      <div class="badge">Booking Ref: ${safeRef}</div>
    </div>
    <div class="content">
      <div class="greeting">Dear ${guestName},</div>
      <p class="intro">
        Thank you for reserving your stay at Royal Mansion Resort Villa. Your booking submission has been received successfully! Below is your complete reservation and payment summary.
      </p>

      <div class="notice">
        <strong>Booking Submission Received!</strong><br />
        Our reservations team is verifying your payment slip / transaction confirmation and will finalize your stay details.
      </div>

      <div class="card">
        <div class="card-title">Stay & Guest Details</div>
        <table class="table">
          <tr><td>Package</td><td>${packageName}</td></tr>
          <tr><td>Check-in Date</td><td>${checkIn} (from 14:00)</td></tr>
          <tr><td>Check-out Date</td><td>${checkOut} (until 11:00)</td></tr>
          <tr><td>Duration</td><td>${booking.nights} Night${booking.nights > 1 ? "s" : ""}</td></tr>
          <tr><td>Guests</td><td>${booking.adults} Adults${booking.children > 0 ? `, ${booking.children} Children` : ""}</td></tr>
          <tr><td>Guest Email</td><td>${guestEmail}</td></tr>
          <tr><td>Guest Phone</td><td>${guestPhone}</td></tr>
          ${guestCountry ? `<tr><td>Country</td><td>${guestCountry}</td></tr>` : ""}
          ${specialRequests ? `<tr><td>Special Requests</td><td>${specialRequests}</td></tr>` : ""}
        </table>
      </div>

      <div class="card">
        <div class="card-title">Booking Price Breakdown</div>
        <table class="price-table">
          ${booking.priceLines.map((l) => `<tr><td>${escapeHtml(l.description)}</td><td style="text-align: right;">${lkr(l.totalAmount)}</td></tr>`).join("")}
          <tr class="total-row"><td>Grand Total</td><td style="text-align: right;">${lkr(booking.grandTotal)}</td></tr>
          <tr class="deposit-row"><td>Deposit Required / Paid</td><td style="text-align: right;">${lkr(booking.depositRequired)}</td></tr>
          <tr><td>Balance Due on Arrival</td><td style="text-align: right;">${lkr(booking.balanceDue)}</td></tr>
        </table>
      </div>

      <div class="card">
        <div class="card-title">Resort Location & Contact</div>
        <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
          <strong>Royal Mansion Resort Villa</strong><br />
          No.21, Prime Panoramic, Paradeka, Pussallawa, Sri Lanka<br />
          Phone / WhatsApp: +94 76 400 1245<br />
          Email: info.royalmationresort@gmail.com
        </p>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Royal Mansion Resort Villa. All rights reserved.</p>
      <p>Have questions? Email us directly at <a href="mailto:info.royalmationresort@gmail.com">info.royalmationresort@gmail.com</a> or call +94 76 400 1245.</p>
    </div>
  </div>
</body>
</html>
    `;
        const plainText = `
Royal Mansion Resort Villa - Booking Summary
Reference: ${booking.reference}
Guest: ${guestName} (${booking.guest.email})
Package: ${booking.package?.name ?? "Royal Mansion Villa Package"}
Check-in: ${checkIn} (from 14:00)
Check-out: ${checkOut} (until 11:00)
Guests: ${booking.adults} Adults${booking.children > 0 ? `, ${booking.children} Children` : ""}
Grand Total: ${lkr(booking.grandTotal)}
Deposit: ${lkr(booking.depositRequired)}
Balance Due on Arrival: ${lkr(booking.balanceDue)}

Location: No.21, Prime Panoramic, Paradeka, Pussallawa, Sri Lanka
Contact: +94 76 400 1245 | info.royalmationresort@gmail.com
    `.trim();
        const adminEmail = env_1.env.ADMIN_NOTIFICATION_EMAIL && !env_1.env.ADMIN_NOTIFICATION_EMAIL.includes("example.test")
            ? env_1.env.ADMIN_NOTIFICATION_EMAIL
            : undefined;
        let guestSent = false;
        let adminSent = false;
        // Send emails using Nodemailer
        const transporter = getEmailTransporter();
        if (transporter) {
            // 1. Send confirmation to Guest
            try {
                await transporter.sendMail({
                    from: fromEmail,
                    to: guestEmailRaw,
                    subject,
                    html,
                    text: plainText,
                });
                guestSent = true;
                console.log(`✅ [email-nodemailer] Booking summary delivered to guest: ${guestEmailRaw} (${booking.reference})`);
            }
            catch (guestErr) {
                console.warn(`⚠️ [email-nodemailer] Failed to deliver booking summary to guest (${guestEmailRaw}):`, guestErr);
            }
            // 2. Send notification to Resort Admin
            if (adminEmail && adminEmail.toLowerCase() !== guestEmailRaw.toLowerCase()) {
                try {
                    const adminHtml = `
            <div style="background:#f0fdf4;border:1px solid #86efac;padding:12px 16px;margin-bottom:16px;border-radius:6px;font-family:sans-serif;font-size:13px;color:#166534;">
              <strong>Admin Notification:</strong> A new booking submission was received from <strong>${guestName}</strong> (${guestEmail}, phone: ${guestPhone}).
            </div>
            ${html}
          `;
                    await transporter.sendMail({
                        from: fromEmail,
                        to: adminEmail,
                        subject: `[Admin Alert - Guest: ${guestNameRaw}] ${subject}`,
                        html: adminHtml,
                        text: `[Admin Alert: New booking from ${guestNameRaw} (${guestEmailRaw})]\n\n${plainText}`,
                    });
                    adminSent = true;
                    console.log(`✅ [email-nodemailer] Booking alert delivered to admin: ${adminEmail} (${booking.reference})`);
                }
                catch (adminErr) {
                    console.warn(`⚠️ [email-nodemailer] Failed to deliver booking alert to admin (${adminEmail}):`, adminErr);
                }
            }
        }
        else {
            console.warn(`ℹ️ [email-nodemailer] SMTP is not configured (SMTP_USER, SMTP_PASS, SMTP_HOST/SMTP_SERVICE). Live email dispatch skipped. Email recorded locally.`);
        }
        // 3. Persist a backup copy in logs/emails/
        try {
            const emailLogDir = path_1.default.resolve(process.cwd(), "logs/emails");
            if (!fs_1.default.existsSync(emailLogDir))
                fs_1.default.mkdirSync(emailLogDir, { recursive: true });
            const emailFile = path_1.default.join(emailLogDir, `${booking.reference}_${Date.now()}.html`);
            fs_1.default.writeFileSync(emailFile, html, "utf-8");
            console.log(`📁 [email-nodemailer] Booking summary recorded to ${emailFile}`);
        }
        catch {
            // Ignore file log write issues
        }
        // 4. Record in Prisma audit log
        await prisma.auditLog
            .create({
            data: {
                action: "BOOKING_SUMMARY_EMAIL_SENT",
                entityType: "Booking",
                entityId: booking.reference,
                newValues: {
                    to: guestEmail,
                    subject,
                    delivery: guestSent || adminSent ? "SENT" : "LOGGED",
                    guestDelivered: guestSent,
                    adminDelivered: adminSent,
                    service: "nodemailer",
                },
            },
        })
            .catch(() => null);
        return true;
    }
    catch (err) {
        console.error(`❌ [email-nodemailer] Error in sendBookingSummaryEmail:`, err);
        return false;
    }
}
