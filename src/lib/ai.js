// Calls the Anthropic Messages API directly from the app with the user's key.
export const MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5 (recommended)' },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5 (cheaper, faster)' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5 (best, priciest)' },
];

export async function askClaude({ settings, system, messages, maxTokens = 2000, temperature = 0.9 }) {
  if (!settings?.apiKey) throw new Error('Add your Anthropic API key in Settings first.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model || MODELS[0].id,
      max_tokens: maxTokens,
      temperature,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try {
      const j = await res.json();
      msg += `: ${j.error?.message || JSON.stringify(j)}`;
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

// Pull the first JSON object out of a model reply.
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const src = fenced ? fenced[1] : text;
  const start = src.indexOf('{');
  const end = src.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(src.slice(start, end + 1));
  } catch {
    return null;
  }
}
