import { GoogleGenerativeAI } from "@google/generative-ai";

type CompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MAX_TOKENS = parseInt(
  process.env.GEMINI_MAX_TOKENS || process.env.OPENAI_MAX_TOKENS || "1000",
);
const TEMPERATURE = parseInt(
  process.env.GEMINI_TEMPERATURE || process.env.OPENAI_TEMPERATURE || "0",
);
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash";
const GEMINI_VISION_MODEL =
  process.env.GEMINI_VISION_MODEL ||
  process.env.GEMINI_TEXT_MODEL ||
  "gemini-2.0-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant.";

const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

function normalizeMessages(history?: CompletionMessage[]) {
  const messages = history ?? [
    { role: "system", content: DEFAULT_SYSTEM_PROMPT },
  ];
  if (!messages.find((msg) => msg.role === "system")) {
    messages.unshift({ role: "system", content: DEFAULT_SYSTEM_PROMPT });
  }
  return messages;
}

function toGeminiHistory(history: CompletionMessage[]) {
  return history
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
}

export async function completeChat(
  prompt: string,
  history?: CompletionMessage[],
) {
  const messages = normalizeMessages(history);

  const geminiHistory = toGeminiHistory(messages);
  messages.push({ role: "user", content: prompt });

  const systemInstruction =
    messages.find((message) => message.role === "system")?.content ||
    DEFAULT_SYSTEM_PROMPT;
  const model = ai.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    systemInstruction,
    generationConfig: {
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_TOKENS,
    },
  });

  const chat = model.startChat({
    history: geminiHistory,
  });

  const response = await chat.sendMessage(prompt);
  console.debug(response);
  return response.response.text();
}

export async function analyzeReceipt(
  base64file: string,
  definitions?: { categories: string[]; cards: string[] },
) {
  try {
    // Validate base64 string
    if (!base64file || base64file.length === 0) {
      console.error("Empty base64 string provided");
      return { ok: false, error: "Empty image data" };
    }

    // Remove any data URL prefix if present
    const base64Data = base64file.replace(/^data:image\/\w+;base64,/, "");

    console.debug(`Processing image: ${base64Data.length} base64 characters`);

    const model = ai.getGenerativeModel({
      model: GEMINI_VISION_MODEL,
      systemInstruction:
        "Your task is to assist with the recording of expenses.",
      generationConfig: {
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_TOKENS,
      },
    });

    // Build category and payment method lists
    const categoryList = definitions?.categories?.length
      ? definitions.categories.join(", ")
      : "Auto, Beauty, Clothes, Dining, Drinks, Experiences, Gifts, Groceries, Home, Misc, Pets, Subscriptions, Taxi, Technology, Travel, Wellness";

    const paymentList = definitions?.cards?.length
      ? definitions.cards.join(", ")
      : "Cash, Card";

    const prompt = `Here is a photograph of a receipt or a screenshot of a mobile payment transaction confirmation.
Extract the following details from this receipt: [date, payee, currency, grand total, category, payment method]. 
Reply as a JSON-formatted string only. The date must be an ISO-8601 formatted date string (e.g. 2024-02-08). 
An example:
{"date":"2024-12-08","payee":"Little Farms","currency":"SGD","total":123.10,"category":"Dining","payment_method":"card"}

Available Categories: ${categoryList}
Available Payment Methods: ${paymentList}

IMPORTANT INFERENCE RULES:
1. Infer the category from the receipt content, must be one of the available categories above or "UNKNOWN"
2. Infer the payment method from receipt details:
   - If the receipt appears to be a PayNow transaction, record as "Cash"
   - If Shopback, record as "UNKNOWN" unless card details can be inferred
   - Otherwise, infer from visible payment method or use "UNKNOWN" if not identifiable
3. If the currency is unknown, default to SGD
4. If unable to process the request, reply as a JSON-formatted string like so:
{"error": "reason"}

NEVER wrap the response in markdown code blocks. Return only valid JSON.`;

    const response = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
    ]);

    console.debug(response);

    return {
      ok: true,
      id: (response as any).responseId,
      usage: (response as any).usageMetadata,
      json: response.response.text(),
    };
  } catch (e) {
    console.error("Failed to analyze receipt:", e);
    return { ok: false, error: e };
  }
}
