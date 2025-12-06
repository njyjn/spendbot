import moment from "moment";
import { completeChat } from "./ai";
import { addExpense } from "../pages/api/expense";
import { getDefintions } from "../pages/api/definitions";
import getDb from "./kysely";

const DEFAULT_PAYMENT_METHOD = "UNKNOWN";
const DEFAULT_CATEGORY = "UNKNOWN";
const DEFAULT_CURRENCY = "SGD";

const NLP_SYSTEM_PROMPT = (categories: string[], methods: string[]) => `You are an expense parsing assistant. Your job is to extract expense information from natural language input.

Available Categories: ${categories.join(", ")}
Available Payment Methods: ${methods.join(", ")}

From the user's input, extract:
1. Amount (required) - must be a positive number
2. Payee/Merchant (required) - name of the store/merchant
3. Category (infer from payee, must be one of the available categories, or "UNKNOWN")
4. Payment Method (infer from user's mention or context, must be one of the available methods, or "UNKNOWN")
5. Currency (infer from user's mention, default to SGD)
6. Date (infer from user's mention, MUST be a valid ISO-8601 date string if provided, otherwise return null)

IMPORTANT RULES:
- If payment method is not mentioned or unknown, use "UNKNOWN"
- Always assume SGD currency unless explicitly stated otherwise
- Smart category inference: NTUC Fairprice → Groceries, Starbucks → Dining, Watsons → Beauty, etc.
- If you can't determine a category, use "UNKNOWN"
- If currency is not SGD, convert the amount to SGD
- NEVER wrap the response in markdown code blocks or \`\`\`json tags
- For date: if user specifies a date, return valid ISO-8601 format (YYYY-MM-DD). If NO date is mentioned or unknown, return null
- Return ONLY raw JSON, nothing else

Respond with ONLY this JSON structure (no markdown, no extra text):
{"amount": <number>, "payee": "<string>", "category": "<string>", "payment_method": "<string>", "currency": "<string>", "date": "<YYYY-MM-DD or null>", "error": null}

If you cannot parse the input or it's invalid, return:
{"error": "<reason>", "amount": null, "payee": null, "category": null, "payment_method": null, "currency": null, "date": null}`;

export interface ParsedExpense {
  ok: boolean;
  expense?: {
    date: string;
    payee: string;
    category: string;
    amount: number;
    currency: string;
    payment_method: string;
  };
  error?: string;
}

/**
 * Parse natural language text to extract and record an expense
 * @param text - Natural language input (e.g., "I spent $10 on NTUC with my card")
 * @param telegramId - Telegram user ID to identify the person
 * @returns Parsed expense data or error
 */
export async function parseAndAddExpense(
  text: string,
  telegramId?: string,
): Promise<ParsedExpense> {
  try {
    console.info(`[NLP Expense] Processing: "${text}"`);

    // Fetch definitions from sheet (cached at source)
    const definitions = await getDefintions();
    if (!definitions || !definitions.categories || !definitions.cards) {
      return { ok: false, error: "Failed to load definitions from sheet" };
    }

    const VALID_CATEGORIES = definitions.categories || [];
    const VALID_PAYMENT_METHODS = definitions.cards || [];

    // Use AI to parse the natural language input
    const systemPrompt = NLP_SYSTEM_PROMPT(VALID_CATEGORIES, VALID_PAYMENT_METHODS);
    const response = await completeChat(text, [
      { role: "system", content: systemPrompt },
    ]);

    if (!response) {
      return { ok: false, error: "Failed to parse expense with AI" };
    }

    console.debug("AI Response:", response);

    // Strip markdown code blocks if present
    let jsonString = response.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse the JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", response);
      return { ok: false, error: "Invalid AI response format" };
    }

    // Check for errors in the parsed data
    if (parsedData.error) {
      return { ok: false, error: parsedData.error };
    }

    // Validate required fields
    if (!parsedData.amount || !parsedData.payee) {
      return {
        ok: false,
        error: "Could not extract amount and/or payee from input",
      };
    }

    // Validate and normalize category
    const category = VALID_CATEGORIES.includes(parsedData.category)
      ? parsedData.category
      : DEFAULT_CATEGORY;

    // Validate and normalize payment method
    const payment_method = VALID_PAYMENT_METHODS.includes(parsedData.payment_method)
      ? parsedData.payment_method
      : DEFAULT_PAYMENT_METHOD;

    // Parse date - use today if null or invalid
    const expenseDate =
      parsedData.date && moment(parsedData.date).isValid()
        ? moment(parsedData.date).toISOString()
        : moment().toISOString();

    // Get the month for the sheet
    const month = moment(expenseDate).format("MMM YY");

    console.info(
      `[NLP Expense] Parsed - Amount: ${parsedData.amount} ${parsedData.currency}, Payee: ${parsedData.payee}, Category: ${category}, Method: ${payment_method}`,
    );

    // Look up person name from users table
    let personName = "bot"; // fallback
    if (telegramId) {
      const db = getDb();
      const user = await db
        .selectFrom("users")
        .select(["first_name"])
        .where("telegram_id", "=", telegramId)
        .executeTakeFirst();
      
      if (user) {
        personName = user.first_name;
        console.debug(`[NLP Expense] Found user: ${personName} (telegram_id: ${telegramId})`);
      } else {
        console.warn(`[NLP Expense] No user found for telegram_id: ${telegramId}, using 'bot'`);
      }
    }

    // Add the expense to the sheet
    const addResult = await addExpense(
      month,
      expenseDate,
      parsedData.payee,
      category,
      parsedData.amount,
      payment_method,
      personName,
    );

    if (addResult.ok) {
      return {
        ok: true,
        expense: {
          date: expenseDate,
          payee: parsedData.payee,
          category,
          amount: parsedData.amount,
          currency: parsedData.currency,
          payment_method,
        },
      };
    } else {
      return {
        ok: false,
        error: (addResult.error as any)?.message || "Failed to add expense",
      };
    }
  } catch (e: any) {
    console.error("NLP expense parsing error:", e);
    return { ok: false, error: e.message || "Internal server error" };
  }
}
