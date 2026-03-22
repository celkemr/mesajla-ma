import OpenAI from 'openai';
import type { ChatMessage } from './db';

// --- Telegram ---
export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return res.ok;
  } catch { return false; }
}

// --- Webhook ---
export async function sendWebhook(webhookUrl: string, payload: object): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch { return false; }
}

// --- HubSpot ---
export async function createHubSpotContact(apiKey: string, data: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<boolean> {
  try {
    const properties: Record<string, string> = {};
    if (data.email) properties.email = data.email;
    if (data.name) {
      const parts = data.name.trim().split(' ');
      properties.firstname = parts[0];
      if (parts.length > 1) properties.lastname = parts.slice(1).join(' ');
    }
    if (data.phone) properties.phone = data.phone;

    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ properties }),
    });
    return res.ok;
  } catch { return false; }
}

// --- Pipedrive ---
export async function createPipedriveContact(apiToken: string, domain: string, data: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<boolean> {
  try {
    const payload: Record<string, unknown> = { name: data.name || 'Bilinmeyen Ziyaretçi' };
    if (data.email) payload.email = [{ value: data.email, primary: true }];
    if (data.phone) payload.phone = [{ value: data.phone, primary: true }];

    const res = await fetch(`https://${domain}.pipedrive.com/api/v1/persons?api_token=${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch { return false; }
}

// --- AI Summary ---
export async function generateConversationSummary(openaiApiKey: string, messages: ChatMessage[]): Promise<string | null> {
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const text = messages
      .filter(m => !m.content.startsWith('[Dosya:'))
      .slice(-20)
      .map(m => `${m.role === 'user' ? 'Ziyaretçi' : 'Bot'}: ${m.content}`)
      .join('\n');

    if (!text.trim()) return null;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Verilen chat konuşmasını tek cümleyle özetle. Türkçe yaz. Sadece özeti ver.' },
        { role: 'user', content: text },
      ],
      max_tokens: 120,
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch { return null; }
}
