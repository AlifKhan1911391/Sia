// netlify/functions/chat.js
// Sia AI — apifreellm.com Proxy
// Add your key in Netlify → Site Settings → Environment Variables
// Variable name: FREELLM_API_KEY

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const API_KEY = process.env.FREELLM_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "FREELLM_API_KEY not set in Netlify environment variables." }),
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON body." }) };
  }

  const { messages = [], systemPrompt = "" } = body;

  // apifreellm accepts a single "message" string only.
  // We embed: system prompt + full conversation history + latest user turn.
  const history = messages
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "User" : "Girlfriend"}: ${m.text}`)
    .join("\n");

  const latest = messages[messages.length - 1]?.text || "";

  const fullMessage = [
    systemPrompt,
    history ? `\n\n[Conversation history]\n${history}` : "",
    `\n\nUser: ${latest}`,
    "\nGirlfriend:",
  ].join("").trim();

  try {
    const res = await fetch("https://apifreellm.com/api/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ message: fullMessage }),
    });

    if (res.status === 429) {
      return {
        statusCode: 429,
        headers: cors,
        body: JSON.stringify({ error: "rate_limited" }),
      };
    }

    if (!res.ok) {
      const txt = await res.text();
      return {
        statusCode: res.status,
        headers: cors,
        body: JSON.stringify({ error: `API Error ${res.status}: ${txt}` }),
      };
    }

    const data = await res.json();
    if (!data.success) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Unsuccessful API response." }) };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ reply: data.response || "Ami ekhon bolte parcchi na... 😔" }),
    };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
