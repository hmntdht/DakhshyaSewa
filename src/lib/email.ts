import 'server-only';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || 'noreply.dakshyasewa@gmail.com';
  const pass = process.env.SMTP_PASS;

  if (!pass) {
    throw new Error('SMTP credentials are not configured. Set SMTP_PASS in environment variables.');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export interface SendOtpEmailParams {
  to: string;
  name?: string;
  otp: string;
}

/**
 * Sends a branded OTP verification email using the configured SMTP server.
 */
export async function sendOtpEmail({ to, name, otp }: SendOtpEmailParams) {
  const mailer = getTransporter();
  const from = process.env.EMAIL_FROM || `Daksha Sewa <${process.env.SMTP_USER || 'noreply.dakshyasewa@gmail.com'}>`;
  const recipientName = name?.trim() || 'there';

  const subject = `Your Daksha Sewa Verification Code: ${otp}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f3f4f6;
    }
    .container {
      max-width: 520px;
      margin: 40px auto;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px 32px;
      text-align: center;
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(17, 24, 39, 0) 100%);
      border-bottom: 1px solid #1f2937;
    }
    .brand {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin: 0;
    }
    .brand-accent {
      color: #f43f5e;
    }
    .subbrand {
      font-size: 13px;
      color: #9ca3af;
      margin-top: 4px;
    }
    .content {
      padding: 32px;
      text-align: center;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 12px;
    }
    .lead {
      font-size: 14px;
      line-height: 1.6;
      color: #9ca3af;
      margin-bottom: 28px;
    }
    .otp-box {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 12px;
      padding: 20px 24px;
      margin: 0 auto 28px auto;
      display: inline-block;
    }
    .otp-code {
      font-family: 'SF Mono', Consolas, Monaco, monospace;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 6px;
      color: #38bdf8;
      display: block;
    }
    .note {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.5;
    }
    .footer {
      padding: 20px 32px;
      text-align: center;
      border-top: 1px solid #1f2937;
      background: #0d131f;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="brand">Daksha <span class="brand-accent">Sewa</span></h1>
      <div class="subbrand">दक्ष सेवा • On-Demand Local Services</div>
    </div>
    <div class="content">
      <div class="greeting">Hello ${escapeHtml(recipientName)},</div>
      <p class="lead">
        Thank you for creating an account with Daksha Sewa. Use the one-time verification code below to verify your email address and activate your account:
      </p>
      
      <div class="otp-box">
        <span class="otp-code">${escapeHtml(otp)}</span>
      </div>

      <p class="note">
        This code is valid for <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email. Never share this code with anyone.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Daksha Sewa. All rights reserved.<br>
      Dhangadhi, Kailali, Nepal
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hello ${recipientName},

Your Daksha Sewa email verification code is: ${otp}

This code is valid for 10 minutes. If you did not request this verification code, please ignore this email.

— Daksha Sewa (दक्ष सेवा)
Dhangadhi, Kailali, Nepal
  `.trim();

  return await mailer.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

export interface AdminBookingEmailParams {
  bookingId: string;
  code: string;
  serviceName: string;
  customerName: string;
  customerPhone?: string;
  scheduledStart: string;
  durationHours: number;
  totalAmount: number;
  paymentProvider: string;
  address: string;
  landmark?: string;
  notes?: string;
}

/**
 * Sends a notification email to all email addresses in ADMIN_NOTIFY_EMAIL
 * whenever a new booking is created.
 */
export async function sendAdminNewBookingEmail(params: AdminBookingEmailParams) {
  const rawNotify = process.env.ADMIN_NOTIFY_EMAIL || '';
  const recipients = rawNotify
    .split(',')
    .map((e) => e.trim().replace(/^["']|["']$/g, ''))
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  if (recipients.length === 0) {
    console.warn('[email] No valid ADMIN_NOTIFY_EMAIL configured in environment');
    return;
  }

  const mailer = getTransporter();
  const from = process.env.EMAIL_FROM || `Daksha Sewa <${process.env.SMTP_USER || 'noreply.dakshyasewa@gmail.com'}>`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const adminUrl = `${siteUrl}/admin/bookings/${params.bookingId}`;

  const subject = `[New Booking ${params.code}] ${params.serviceName} - ${params.customerName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .container { max-width: 600px; margin: 30px auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { padding: 28px 32px; background: linear-gradient(135deg, #1e293b, #0f172a); border-bottom: 1px solid #334155; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #f59e0b20; color: #fbbf24; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; }
    .title { margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; }
    .content { padding: 32px; }
    .callout { background: #f59e0b15; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; color: #fef3c7; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th, td { padding: 12px 14px; text-align: left; font-size: 14px; }
    th { color: #9ca3af; font-weight: 500; border-bottom: 1px solid #1f2937; width: 35%; }
    td { color: #f3f4f6; font-weight: 600; border-bottom: 1px solid #1f2937; }
    .btn { display: block; text-align: center; background: #d97706; color: #ffffff !important; padding: 14px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; margin-top: 10px; }
    .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: #6b7280; background: #0b0f19; border-top: 1px solid #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Action Required: Assign Worker</span>
      <h1 class="title">New Customer Booking: ${escapeHtml(params.code)}</h1>
    </div>
    <div class="content">
      <div class="callout">
        <strong>Administrator Action Required:</strong> A customer has submitted this booking. Please contact the customer to confirm the order and manually assign an available worker from the admin portal.
      </div>
      <table>
        <tr><th>Booking Code</th><td>${escapeHtml(params.code)}</td></tr>
        <tr><th>Service</th><td>${escapeHtml(params.serviceName)}</td></tr>
        <tr><th>Customer Name</th><td>${escapeHtml(params.customerName)}</td></tr>
        <tr><th>Phone Number</th><td><a href="tel:${escapeHtml((params.customerPhone || '').replace(/[^\d+]/g, ''))}" style="color:#fbbf24; text-decoration:underline;">${escapeHtml(params.customerPhone || 'Not provided')}</a></td></tr>
        <tr><th>Scheduled Time</th><td>${escapeHtml(params.scheduledStart)}</td></tr>
        <tr><th>Duration</th><td>${escapeHtml(params.durationHours)} hour(s)</td></tr>
        <tr><th>Total Amount</th><td>Rs ${escapeHtml(params.totalAmount.toFixed(2))}</td></tr>
        <tr><th>Payment Method</th><td style="text-transform: capitalize;">${escapeHtml(params.paymentProvider)}</td></tr>
        <tr><th>Address</th><td>${escapeHtml(params.address)}${params.landmark ? ` (Landmark: ${escapeHtml(params.landmark)})` : ''}</td></tr>
        ${params.notes ? `<tr><th>Customer Notes</th><td style="font-weight: normal; font-style: italic;">“${escapeHtml(params.notes)}”</td></tr>` : ''}
      </table>
      <a href="${escapeHtml(adminUrl)}" class="btn">Open Booking in Admin Panel to Assign Worker</a>
    </div>
    <div class="footer">
      Daksha Sewa (दक्ष सेवा) Admin Notification System<br>
      Dhangadhi, Kailali, Nepal
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
[NEW BOOKING RECEIVED - ACTION REQUIRED]
Booking Code: ${params.code}
Service: ${params.serviceName}
Customer: ${params.customerName}
Phone: ${params.customerPhone || 'N/A'}
Scheduled: ${params.scheduledStart} (${params.durationHours}h)
Total: Rs ${params.totalAmount.toFixed(2)}
Payment: ${params.paymentProvider}
Address: ${params.address} ${params.landmark ? `(Landmark: ${params.landmark})` : ''}
${params.notes ? `Notes: "${params.notes}"` : ''}

Please contact the customer to confirm the order and assign a worker:
${adminUrl}

— Daksha Sewa Admin System
  `.trim();

  return await mailer.sendMail({
    from,
    to: recipients,
    subject,
    text,
    html,
  });
}

export interface AdminEnquiryEmailParams {
  name: string;
  phone: string;
  email?: string;
  service?: string;
  message?: string;
}

/**
 * Sends a notification email to ADMIN_NOTIFY_EMAIL whenever a visitor
 * submits a message/enquiry on the website.
 */
export async function sendAdminEnquiryEmail(params: AdminEnquiryEmailParams) {
  const rawNotify = process.env.ADMIN_NOTIFY_EMAIL || '';
  const recipients = rawNotify
    .split(',')
    .map((e) => e.trim().replace(/^["']|["']$/g, ''))
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  if (recipients.length === 0) {
    console.warn('[email] No valid ADMIN_NOTIFY_EMAIL configured for enquiry notifications');
    return;
  }

  const mailer = getTransporter();
  const from = process.env.EMAIL_FROM || `Daksha Sewa <${process.env.SMTP_USER || 'noreply.dakshyasewa@gmail.com'}>`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const adminUrl = `${siteUrl}/admin/enquiries`;

  const subject = `[Website Message] ${params.name}: ${params.service || 'General Enquiry'}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .container { max-width: 600px; margin: 30px auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { padding: 28px 32px; background: linear-gradient(135deg, #1e293b, #0f172a); border-bottom: 1px solid #334155; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #38bdf820; color: #38bdf8; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; }
    .title { margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; }
    .content { padding: 32px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { padding: 12px 14px; text-align: left; font-size: 14px; }
    th { color: #9ca3af; font-weight: 500; border-bottom: 1px solid #1f2937; width: 30%; }
    td { color: #f3f4f6; font-weight: 600; border-bottom: 1px solid #1f2937; }
    .msg-box { background: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 16px; margin: 16px 0 24px 0; font-size: 14px; line-height: 1.6; color: #f9fafb; white-space: pre-wrap; }
    .btn { display: block; text-align: center; background: #f59e0b; color: #111827 !important; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; }
    .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: #6b7280; background: #0b0f19; border-top: 1px solid #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">New Contact Message</span>
      <h1 class="title">Message from ${escapeHtml(params.name)}</h1>
    </div>
    <div class="content">
      <table>
        <tr><th>Sender Name</th><td>${escapeHtml(params.name)}</td></tr>
        <tr><th>Phone</th><td><a href="tel:${escapeHtml((params.phone || '').replace(/[^\d+]/g, ''))}" style="color:#fbbf24; text-decoration:underline;">${escapeHtml(params.phone)}</a></td></tr>
        ${params.email ? `<tr><th>Email</th><td><a href="mailto:${escapeHtml(params.email)}" style="color:#38bdf8; text-decoration:underline;">${escapeHtml(params.email)}</a></td></tr>` : ''}
        ${params.service ? `<tr><th>Service</th><td>${escapeHtml(params.service)}</td></tr>` : ''}
      </table>
      
      <div style="font-size: 13px; font-weight: 600; color: #9ca3af;">Message:</div>
      <div class="msg-box">${escapeHtml(params.message || '(No message content provided)')}</div>

      <a href="${escapeHtml(adminUrl)}" class="btn">View Enquiries in Admin Portal</a>
    </div>
    <div class="footer">
      Daksha Sewa (दक्ष सेवा) Notification System<br>
      Dhangadhi, Kailali, Nepal
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
[NEW CONTACT MESSAGE RECEIVED]
From: ${params.name}
Phone: ${params.phone}
${params.email ? `Email: ${params.email}\n` : ''}${params.service ? `Service: ${params.service}\n` : ''}
Message:
${params.message || '(No message content provided)'}

Open admin portal: ${adminUrl}
  `.trim();

  return await mailer.sendMail({
    from,
    to: recipients,
    subject,
    text,
    html,
  });
}

export interface UserEnquiryThankYouEmailParams {
  to: string;
  name: string;
  service?: string;
  message?: string;
}

/**
 * Sends a warm thank you confirmation email to the user who submitted an enquiry.
 */
export async function sendUserEnquiryThankYouEmail(params: UserEnquiryThankYouEmailParams) {
  const mailer = getTransporter();
  const from = process.env.EMAIL_FROM || `Daksha Sewa <${process.env.SMTP_USER || 'noreply.dakshyasewa@gmail.com'}>`;
  const recipientName = params.name.trim() || 'there';

  const subject = `Thank you for contacting Daksha Sewa | दक्ष सेवा`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .container { max-width: 560px; margin: 30px auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { padding: 32px; text-align: center; background: linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(17, 24, 39, 0) 100%); border-bottom: 1px solid #1f2937; }
    .brand { font-size: 26px; font-weight: 700; color: #ffffff; margin: 0; }
    .brand-accent { color: #f59e0b; }
    .subbrand { font-size: 13px; color: #9ca3af; margin-top: 4px; }
    .content { padding: 32px; }
    .greeting { font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 14px; }
    .lead { font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 20px; }
    .msg-preview { background: #1f2937; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 14px 16px; margin: 16px 0 24px 0; font-size: 13px; color: #9ca3af; line-height: 1.5; font-style: italic; }
    .callout { background: #f59e0b12; border: 1px solid #f59e0b30; border-radius: 10px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #fef3c7; }
    .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: #6b7280; background: #0b0f19; border-top: 1px solid #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="brand">Daksha <span class="brand-accent">Sewa</span></h1>
      <div class="subbrand">दक्ष सेवा • Home Services in Dhangadhi</div>
    </div>
    <div class="content">
      <div class="greeting">Namaste ${escapeHtml(recipientName)},</div>
      <p class="lead">
        Thank you for contacting us! We have received your message and our team will get in touch with you shortly.
      </p>

      ${params.message ? `
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.5px;">Your Message:</div>
      <div class="msg-preview">“${escapeHtml(params.message)}”</div>
      ` : ''}

      <div class="callout">
        <strong>Need urgent help?</strong> You can also reach our Dhangadhi customer support team directly at <a href="tel:9800670880" style="color:#fbbf24; font-weight: 600; text-decoration: underline;">9800670880</a> or via WhatsApp.
      </div>

      <p style="font-size: 13px; color: #9ca3af; line-height: 1.6; margin: 0;">
        Warm regards,<br>
        <strong style="color: #ffffff;">Team Daksha Sewa (दक्ष सेवा)</strong><br>
        Dhangadhi, Kailali, Nepal
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Daksha Sewa. All rights reserved.<br>
      Website: <a href="http://localhost:3000" style="color:#f59e0b; text-decoration:none;">dakshasewa.com</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Namaste ${recipientName},

Thank you for reaching out to Daksha Sewa (दक्ष सेवा)! We have received your message.

Our customer service team in Dhangadhi will contact you shortly.

${params.message ? `Your message: "${params.message}"\n` : ''}
Need immediate assistance? Call us directly at 9800670880.

Warm regards,
Team Daksha Sewa
Dhangadhi, Kailali, Nepal
  `.trim();

  return await mailer.sendMail({
    from,
    to: params.to,
    subject,
    text,
    html,
  });
}

