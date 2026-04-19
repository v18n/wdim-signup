import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const LATEST_DIGEST_URL =
  'https://raw.githubusercontent.com/v18n/stock-price-monitor/main/latest.html';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const audienceId   = process.env.RESEND_AUDIENCE_ID;
  const fromEmail    = process.env.RESEND_FROM_EMAIL;

  if (!audienceId || !fromEmail) {
    console.error('Missing RESEND_AUDIENCE_ID or RESEND_FROM_EMAIL');
    return res.status(500).json({ error: 'Server misconfiguration.' });
  }

  const normalised = email.toLowerCase().trim();

  try {
    // 1. Add to audience
    await resend.contacts.create({
      email: normalised,
      audienceId,
      unsubscribed: false,
    });
  } catch (err) {
    // 409 = already exists — fine, still send the welcome email
    if (!err?.statusCode?.toString().startsWith('4') || err?.statusCode === 409) {
      // non-4xx error — bail
      if (err?.statusCode !== 409) {
        console.error('Resend contacts error:', err);
        return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
      }
    }
  }

  // 2. Fetch latest digest and send immediately
  try {
    const digestRes = await fetch(LATEST_DIGEST_URL);
    if (digestRes.ok) {
      const html = await digestRes.text();
      await resend.emails.send({
        from:    fromEmail,
        to:      normalised,
        subject: 'Welcome to WDIM. Here\'s the latest edition.',
        html,
      });
    } else {
      console.warn('Could not fetch latest digest — skipping welcome email');
    }
  } catch (err) {
    // Don't fail the signup if the welcome email fails
    console.error('Welcome email error:', err);
  }

  return res.status(200).json({ success: true });
}
