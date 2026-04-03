// js/api.js
// Sia AI — API Controller
// All API configuration is managed here.
// The actual API key lives in Netlify environment variables (GEMINI_API_KEY).
// This file talks to the Netlify serverless function at /.netlify/functions/chat

const SiaAPI = (() => {
  // ─── Endpoint ────────────────────────────────────────────────────────────────
  // Points to the Netlify function proxy. Never put your API key here.
  const ENDPOINT = "/.netlify/functions/chat";

  // ─── Gemini Generation Config ────────────────────────────────────────────────
  const GENERATION_CONFIG = {
    temperature: 0.95,   // Higher = more creative / emotional responses
    maxOutputTokens: 600, // Keep responses concise like real chats
    topK: 40,
    topP: 0.95,
  };

  // ─── Send Message ─────────────────────────────────────────────────────────────
  /**
   * @param {Array<{role: string, text: string}>} messages  - Conversation history
   * @param {string} systemPrompt                           - The filled base prompt
   * @returns {Promise<string>}                             - GF's reply text
   */
  async function sendMessage(messages, systemPrompt) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        systemPrompt,
        config: GENERATION_CONFIG,
      }),
    });

    if (!response.ok) {
      let errMsg = `Server error ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
      } catch { /* ignore parse errors */ }
      throw new Error(errMsg);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.reply;
  }

  // ─── Public Interface ─────────────────────────────────────────────────────────
  return { sendMessage };
})();
