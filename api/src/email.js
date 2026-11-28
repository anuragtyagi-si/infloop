const escapeHtml = text => text.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);

// Sends through Resend when an API key is set; otherwise prints the message to
// the server console so the flow can be followed locally without a key.
export function createMailer({ resendApiKey, emailFrom }) {
  if (!resendApiKey) {
    return async ({ to, subject, text }) => console.log(`[email not sent: RESEND_API_KEY is not set]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
  }
  return async ({ to, subject, text }) => {
    const html = escapeHtml(text).replace(/https?:\/\/\S+/g, url => `<a href="${url}">${url}</a>`).replace(/\n/g, '<br>');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: emailFrom, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Resend rejected the email (${response.status}): ${(await response.text()).slice(0, 300)}`);
  };
}
