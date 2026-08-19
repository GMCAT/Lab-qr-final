import { env } from '../config/env.js';

export async function sendPasswordResetEmail({ email, name, token }) {
  if (!env.resetEmailWebhookUrl) return { delivered:false, reason:'not_configured' };
  const resetUrl = `${env.appBaseUrl.replace(/\/$/,'')}/#/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch(env.resetEmailWebhookUrl, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', ...(env.resetEmailWebhookToken ? { Authorization:`Bearer ${env.resetEmailWebhookToken}` } : {}) },
    body:JSON.stringify({ template:'password-reset', to:email, name, reset_url:resetUrl, expires_minutes:30 })
  });
  if (!response.ok) throw new Error(`RESET_EMAIL_DELIVERY_FAILED_${response.status}`);
  return { delivered:true };
}
