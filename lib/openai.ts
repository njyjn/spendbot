import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || "1000");
const TEMPERATURE = parseInt(process.env.OPENAI_TEMPERATURE || "0");

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI();
  }
  return openai;
}

const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant.";

export async function completeChat(
  prompt: string,
  history?: ChatCompletionMessageParam[],
) {
  let messages = history;
  if (!messages) {
    messages = [{ role: "system", content: DEFAULT_SYSTEM_PROMPT }];
  }
  messages.push({ role: "user", content: prompt });
  const response = await getOpenAI().chat.completions.create({
    messages,
    model: "gpt-4o",
  });

  console.debug("OpenAI response:", response);
  return response.choices[0].message.content;
}

export async function analyzeReceipt(base64file: string) {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Your task is to assist with the recording of expenses.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Here is an photograph of a receipt or a screenshot of a mobile payment transaction confirmation.
                Extract the following details from this receipt: [date, payee, currency,
                grand total, category, payment method]. Reply as a JSON-formatted string only. The date must be an ISO-8601
                formatted date string (e.g. 2024-02-08). An example:
                "{\\"date\\":\\"2024-12-08\\",\\"payee\\":\\"Little Farms\\",\\"currency\\":\\"SGD\\",
                \\"total\\":123.10,\\"category\\":\\"Dining\\",\\"payment_method\\":\\"card\\"}"
                The reply must not be in JSON markdown format e.g. \`\`\`json\n\`\`\`.
                Infer a category of the overall spend from the following list: 
                [Auto, Beauty, Clothes, Dining, Drinks, Experiences, Gifts,Groceries,
                  Home, Misc, Pets, Subscriptions, Taxi, Technology, Travel, Wellness].
                If the currency is unknown, default to SGD.
                If the payment method is unknown, default to Cash.
                If unable to process the request, reply as a JSON-formatted string like so:
                "{\\"error\\": \\"reason\\"}"`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64file}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    });

    console.debug("OpenAI receipt analysis response:", response);

    return {
      ok: true,
      id: response.id,
      usage: response.usage,
      json: response.choices.at(0)?.message.content,
    };
  } catch (e) {
    console.error("Failed to analyze receipt with OpenAI:", e);
    return { ok: false, error: e };
  }
}
