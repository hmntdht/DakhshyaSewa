'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendOtpEmail } from '@/lib/email';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';

export interface SendSignupOtpParams {
  email: string;
  password: string;
  name: string;
}

export interface AuthActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Initiates email OTP signup:
 * 1. Creates or updates user in Supabase auth using admin.generateLink
 * 2. Generates an email OTP
 * 3. Sends the OTP directly via SMTP (Gmail) from .env
 */
export async function sendSignupOtpAction({
  email,
  password,
  name,
}: SendSignupOtpParams): Promise<AuthActionResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (!cleanName || cleanName.length < 2) {
    return { ok: false, error: 'Please enter your full name (minimum 2 characters).' };
  }
  if (!password || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters long.' };
  }

  const ip = await clientIp();
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`signup_ip:${ip}`, 5, 900),
    rateLimit(`signup_email:${cleanEmail}`, 3, 600),
  ]);
  if (!ipOk || !emailOk) {
    return { ok: false, error: 'Too many signup attempts. Please wait a few minutes before trying again.' };
  }

  try {
    const admin = createAdminClient();

    // Generate signup link & email OTP
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
        },
      },
    });

    if (error) {
      if (error.code === 'email_exists') {
        return {
          ok: false,
          error: 'An account with this email already exists. Please log in instead.',
        };
      }
      return { ok: false, error: error.message };
    }

    const otp = data?.properties?.email_otp;
    if (!otp) {
      return { ok: false, error: 'Failed to generate verification code. Please try again.' };
    }

    // Send email using SMTP
    await sendOtpEmail({
      to: cleanEmail,
      name: cleanName,
      otp,
    });

    return { ok: true };
  } catch (err: any) {
    console.error('Error sending signup OTP email:', err);
    return {
      ok: false,
      error: err?.message || 'Failed to send verification email. Please check server logs.',
    };
  }
}

/**
 * Resends the email OTP for an existing unverified signup.
 */
export async function resendSignupOtpAction({
  email,
  name,
}: {
  email: string;
  name?: string;
}): Promise<AuthActionResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { ok: false, error: 'Email address is required.' };
  }

  const ip = await clientIp();
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`resend_ip:${ip}`, 5, 900),
    rateLimit(`resend_email:${cleanEmail}`, 3, 300),
  ]);
  if (!ipOk || !emailOk) {
    return { ok: false, error: 'Too many requests. Please wait a few minutes before requesting another code.' };
  }

  try {
    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: {
        data: {
          ...(name ? { full_name: name.trim() } : {}),
        },
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const otp = data?.properties?.email_otp;
    if (!otp) {
      return { ok: false, error: 'Could not generate a new code. Please try again.' };
    }

    await sendOtpEmail({
      to: cleanEmail,
      name,
      otp,
    });

    return { ok: true };
  } catch (err: any) {
    console.error('Error resending OTP:', err);
    return {
      ok: false,
      error: err?.message || 'Failed to resend verification code.',
    };
  }
}
