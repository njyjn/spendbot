import {
  completeChat as openaiCompleteChat,
  analyzeReceipt as openaiAnalyzeReceipt,
} from "./openai";
import {
  completeChat as geminiCompleteChat,
  analyzeReceipt as geminiAnalyzeReceipt,
} from "./gemini";

type CompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const USE_GEMINI = GEMINI_API_KEY !== "";

/**
 * Complete a chat message with conversation history
 * Automatically routes to Gemini if configured, otherwise falls back to OpenAI
 */
export async function completeChat(
  prompt: string,
  history?: CompletionMessage[],
) {
  if (USE_GEMINI) {
    console.debug("Using Gemini for chat completion");
    return await geminiCompleteChat(prompt, history);
  } else {
    console.debug("Using OpenAI for chat completion");
    return await openaiCompleteChat(prompt, history);
  }
}

/**
 * Analyze a receipt image and extract expense details
 * Automatically routes to Gemini if configured, otherwise falls back to OpenAI
 */
export async function analyzeReceipt(
  base64file: string,
  definitions?: { categories: string[]; cards: string[] },
) {
  if (USE_GEMINI) {
    console.debug("Using Gemini for receipt analysis");
    return await geminiAnalyzeReceipt(base64file, definitions);
  } else {
    console.debug("Using OpenAI for receipt analysis");
    return await openaiAnalyzeReceipt(base64file);
  }
}
