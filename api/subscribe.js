import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  // Basic validation
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    console.error('RESEND_AUDIENCE_ID is not set');
    return res.status(500).json({ error: 'Server misconfiguration.' });
  }

  try {
    await resend.contacts.create({
      email: email.toLowerCase().trim(),
      audienceId,
      unsubscribed: false,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    // Resend returns 409 if contact already exists — treat as success
    if (err?.statusCode === 409 || err?.message?.includes('already exists')) {
      return res.status(200).json({ success: true });
    }

    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
}
