const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model order: try best available, fallback if quota hit
const PRIMARY_MODEL   = 'gemini-flash-lite-latest';   // confirmed working
const FALLBACK_MODEL  = 'gemini-2.0-flash';            // fallback when quota resets

const SYSTEM_PROMPT = `You are LinguaLink AI, a world-class language assistant built into the LinguaLink platform.

Your core capabilities:
- Translate text accurately between any of 100+ languages
- Explain grammar rules with clear examples
- Improve and rephrase messages (formal, casual, professional, polite)
- Teach vocabulary, idioms, and cultural nuances
- Help users communicate confidently across language barriers

Guidelines:
- Be warm, concise, and genuinely helpful
- Format translations clearly: show the original, then each translation on its own line
- When explaining grammar, use simple terms and concrete examples
- If asked to improve text, show the improved version first, then briefly explain what changed
- Never make up translations — if unsure, say so
- Respond in the same language the user is writing in, unless they ask for a specific language`;

// Build a Gemini model instance
const getModel = (modelName = PRIMARY_MODEL) => genAI.getGenerativeModel({
  model: modelName,
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    maxOutputTokens: 1024,
    temperature: 0.7,
  },
});

// Helper: sleep ms
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fs = require('fs');



// POST /api/ai/chat
exports.chat = async (req, res) => {
  try {
    const { history, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI service is not configured.' });
    }

    // Convert frontend history to Gemini format
    const formattedHistory = [];
    for (const msg of (history || [])) {
      const role = (msg.type === 'user' || msg.role === 'user') ? 'user' : 'model';
      const text = msg.text || '';
      if (text.trim()) {
        formattedHistory.push({ role, parts: [{ text }] });
      }
    }

    // Gemini requires alternating user/model roles — remove consecutive same-role
    const cleanHistory = [];
    for (const entry of formattedHistory) {
      const last = cleanHistory[cleanHistory.length - 1];
      if (!last || last.role !== entry.role) cleanHistory.push(entry);
    }

    // Try primary model, fallback to lite on quota error
    const modelNames = [PRIMARY_MODEL, FALLBACK_MODEL];
    let lastError = null;

    for (const modelName of modelNames) {
      try {
        const model = getModel(modelName);
        const chatSession = model.startChat({ history: cleanHistory });
        const result = await chatSession.sendMessage(message.trim());
        const text = result.response.text();
        return res.json({ text });
      } catch (err) {
        lastError = err;
        const isQuota = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED');
        if (isQuota) {
          console.warn(`Quota hit for ${modelName}, trying fallback...`);
          await sleep(1000);
          continue; // try next model
        }
        throw err; // non-quota error — rethrow immediately
      }
    }

    // Both models exhausted
    throw lastError;

  } catch (error) {
    console.error('Gemini Chat Error:', error?.message || error);
    const isQuota = error?.message?.includes('quota') || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const msg = isQuota
      ? 'AI is temporarily rate-limited. Please wait a moment and try again.'
      : error?.message?.includes('API_KEY_INVALID')
        ? 'AI service key is invalid. Please contact support.'
        : 'AI service temporarily unavailable. Please try again.';
    return res.status(503).json({ error: msg });
  }
};


// POST /api/ai/translate
exports.translate = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and targetLanguage are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI service is not configured.' });
    }

    const translateModel = genAI.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.3,
      },
    });

    const prompt = `Translate the following text into ${targetLanguage}. Return ONLY the translated text, without any explanations or quotes.
Text: "${text}"`;

    const result = await translateModel.generateContent(prompt);
    const translatedText = result.response.text().trim();

    return res.json({ original: text, translated: translatedText, targetLanguage });

  } catch (error) {
    console.error('Gemini Translate Error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to translate message.' });
  }
};
