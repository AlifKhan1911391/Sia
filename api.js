// api.js — Sia AI · API Controller
// Proxies to /.netlify/functions/chat → apifreellm.com
// Your FREELLM_API_KEY lives only in Netlify env vars. Never in this file.

const SiaAPI = (() => {
  const ENDPOINT      = "/.netlify/functions/chat";
  const RATE_LIMIT_MS = 25000; // free tier: 1 req / 25 s
  let   lastSentAt    = 0;

  async function sendMessage(messages, systemPrompt) {
    const now     = Date.now();
    const elapsed = now - lastSentAt;

    if (lastSentAt > 0 && elapsed < RATE_LIMIT_MS) {
      const secs = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
      throw new Error(`rate_wait:${secs}`);
    }

    lastSentAt = now;

    const res = await fetch(ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages, systemPrompt }),
    });

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      if (res.status === 429 || data.error === "rate_limited") {
        throw new Error("rate_wait:25");
      }
      throw new Error(data.error || `Server error ${res.status}`);
    }

    if (data.error) throw new Error(data.error);
    return data.reply;
  }

  return { sendMessage };
})();
