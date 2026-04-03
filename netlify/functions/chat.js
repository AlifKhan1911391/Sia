// netlify/functions/chat.js
// Sam AI — apifreellm.com Proxy
// Set FREELLM_API_KEY in Netlify → Site Settings → Environment Variables

exports.handler = async function (event) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };

  const API_KEY = process.env.FREELLM_API_KEY;
  if (!API_KEY) {
    console.error('FREELLM_API_KEY is not set');
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: { message: 'API key not configured. Set FREELLM_API_KEY in Netlify environment variables.' } }),
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: { message: 'Invalid JSON body.' } }) }; }

  // Extract same fields the frontend already sends (Gemini-style format)
  const { systemInstruction, contents = [] } = body;

  // System prompt
  const systemPrompt = systemInstruction?.parts?.map(p => p.text).join('') || '';

  // Conversation history (all except last message)
  const historyLines = contents.slice(0, -1).map(msg => {
    const text = msg.parts?.map(p => p.text || '').join('') || '';
    return `${msg.role === 'user' ? 'User' : 'Girlfriend'}: ${text}`;
  }).join('\n');

  // Current user message (last item)
  const lastMsg = contents[contents.length - 1];
  const userText = lastMsg?.parts?.map(p => p.text || '').join('') || '';

  // apifreellm only takes a single "message" string — pack everything in
  const fullMessage = [
    systemPrompt,
    historyLines ? `\n\n[Conversation so far]\n${historyLines}` : '',
    `\n\nUser: ${userText}`,
    '\nGirlfriend:',
  ].join('').trim();

  console.log('Sending to apifreellm, turns:', contents.length);

  try {
    const res = await fetch('https://apifreellm.com/api/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ message: fullMessage }),
    });

    console.log('apifreellm status:', res.status);

    if (res.status === 429) {
      return { statusCode: 429, headers: cors, body: JSON.stringify({ error: { message: 'rate_limited' } }) };
    }

    if (!res.ok) {
      const errText = await res.text();
      return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: { message: `API error ${res.status}: ${errText}` } }) };
    }

    const data = await res.json();

    if (!data.success) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: { message: 'Unsuccessful API response.' } }) };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ response: data.response || '' }),
    };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: { message: err.message } }) };
  }
};
