export type ResendSendResponse = {
  id?: string;
};

export async function sendWithResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const { apiKey, from, to, subject, html, text } = params;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Resend error (${res.status}): ${bodyText.slice(0, 400)}`);
  }

  try {
    return JSON.parse(bodyText) as ResendSendResponse;
  } catch {
    return {} as ResendSendResponse;
  }
}
