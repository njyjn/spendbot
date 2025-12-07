import { NextApiRequest, NextApiResponse } from "next";
import { Telegraf, session, type Context } from "telegraf";
import { Message, Update } from "@telegraf/types";
import {
  InlineKeyboardButton,
  KeyboardButton,
  MessageEntity,
} from "telegraf/typings/core/types/typegram";
import { message, callbackQuery } from "telegraf/filters";
import { analyzeReceipt, completeChat } from "../../lib/ai";
import { parseExpense } from "../../lib/nlp";
import moment from "moment";
import { addExpense } from "./expense";
import getDb from "@/lib/kysely";
import { getDefintions } from "./definitions";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const BASE_PATH = process.env.BASE_PATH || "";
const IS_TEST_ENV = process.env.NODE_ENV === "development";

interface ContextWithSession<U extends Update = Update> extends Context<U> {
  session: {
    count: number;
    type: string;
    metadata?: any;
    root?: number;
  };
}

const receiptInlineKeyboard: InlineKeyboardButton[][] = [
  [
    {
      text: "Submit",
      callback_data: "submit",
    },
    {
      text: "Edit",
      callback_data: "edit",
    },
  ],
  [
    {
      text: "Validate",
      callback_data: "validate",
    },
    {
      text: "Manual Entry",
      url: "https://bot.ngsim.net/spend/add",
    },
  ],
  [
    {
      text: "Date",
      callback_data: "date",
    },
    {
      text: "Payee",
      callback_data: "payee",
    },
  ],
  [
    {
      text: "Currency",
      callback_data: "currency",
    },
    {
      text: "Total",
      callback_data: "total",
    },
  ],
  [
    {
      text: "Category",
      callback_data: "category",
    },
    {
      text: "Payment Method",
      callback_data: "payment_method",
    },
  ],
  [
    {
      text: "Cancel",
      callback_data: "cancel",
    },
  ],
];

function getDateAndMonth(date: string) {
  const validDate = moment(date);
  const month = validDate.format("MMM YY");
  return {
    validDate,
    month,
  };
}

function getUsernameMentionEntity(
  username: string,
  source: string,
  messageEntities?: MessageEntity[],
) {
  if (!messageEntities) return undefined;
  const mentions = messageEntities.filter(
    (entity) => entity.type === "mention",
  );
  if (mentions.length > 0) {
    const usernames = mentions.map((mention, index) => {
      return {
        value: source.slice(mention.offset, mention.offset + mention.length),
        index,
      };
    });
    const matched = usernames.find((u) => u.value === "@" + username);
    if (matched) {
      return mentions.at(matched.index);
    }
  }
  return undefined;
}

function isUsernameMentioned(
  username: string,
  source: string,
  messageEntities?: MessageEntity[],
) {
  const entity = getUsernameMentionEntity(username, source, messageEntities);
  return entity !== undefined;
}

function isUsernameCommanded(
  username: string,
  source: string,
  messageEntities?: MessageEntity[],
) {
  if (!messageEntities) return false;
  const commands = messageEntities.filter(
    (entity) => entity.type === "bot_command",
  );
  if (commands.length === 1) {
    // Username must be present in command;
    const command = source
      .slice(commands[0].offset, commands[0].length)
      .split("@");
    const parsedUsername = command.at(1);
    if (parsedUsername && parsedUsername === username) {
      return true;
    }
  }
  return false;
}

const db = getDb();

const bot = new Telegraf<ContextWithSession>(BOT_TOKEN, {
  telegram: {
    testEnv: IS_TEST_ENV,
    webhookReply: false,
  },
});

bot.use(
  session({
    getSessionKey: (ctx) =>
      ctx.chat && ctx.from ? `${ctx.chat.id}:${ctx.from.id}` : undefined,
    defaultSession: () => ({ count: 0, type: "default" }),
  }),
);

bot.start(async (ctx) => {
  await handleStartCommand(ctx);
});

bot.use(async (ctx, next) => {
  // In group chats, only @mentions are handled, unless there is prior compatible session context
  if (ctx.chat!.type === "private") {
    return await next();
  } else {
    const { message, callbackQuery, session } = ctx;
    if (message && "text" in message) {
      if (
        isUsernameCommanded(
          ctx.botInfo.username,
          message.text,
          message.entities,
        )
      ) {
        return await next();
      }
      // Conversations not supported. Must have existing context
      if (session.type === "receipt") {
        if (
          isUsernameMentioned(
            ctx.botInfo.username,
            message.text,
            message.entities,
          )
        ) {
          return await next();
        }
      } else {
        return await ctx.reply(
          `I can only hold conversations in direct messages. Let's take this to @${ctx.botInfo.username}.`,
          {
            reply_parameters: {
              message_id: ctx.message!.message_id,
            },
            disable_notification: true,
          },
        );
      }
    } else if (message && "photo" in message && "caption" in message) {
      // Caption must contain bot username @username
      if (
        isUsernameMentioned(
          ctx.botInfo.username,
          message.caption!,
          message.caption_entities,
        )
      ) {
        return await next();
      }
    } else if (callbackQuery && "data" in callbackQuery) {
      if (session.type === "receipt") {
        return await next();
      }
    }
  }
  clearSession(ctx);
});

bot.use(async (ctx, next) => {
  // Security -- only authorized users can engage
  const user = await db
    .selectFrom("users")
    .select(["first_name", "telegram_id"])
    .where("telegram_id", "=", ctx.from!.id.toString())
    .executeTakeFirst();
  if (user) {
    console.info(
      `Registered user ${user.first_name} (${user.telegram_id}) engaging...`,
    );
    await next();
  } else {
    console.info(`User ${ctx.from!.id} attempted to engage`);
  }
});

bot.command("json", async (ctx) => {
  const { message, session } = ctx;

  session.count = 1;
  session.type = "receipt";
  session.root = message.message_id;

  const commandEntity = ctx.message.entities!.filter(
    (entity) => entity.type === "bot_command",
  )[0];
  const command = message.text.slice(
    commandEntity.offset,
    commandEntity.length,
  );

  try {
    const contents = message.text.split(command + " ")[1];
    const { date, payee, currency, total, category, payment_method } =
      JSON.parse(contents);
    session.metadata = {
      date,
      payee,
      currency,
      total,
      category,
      payment_method,
    };
    await ctx.reply(`\`\`\`json\n${contents}\n\`\`\``, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: receiptInlineKeyboard,
      },
      reply_parameters: {
        message_id: message.message_id,
      },
    });
  } catch (e) {
    await ctx.reply(`Something went wrong: ${e}`);
  }
});

bot.command("expense", async (ctx) => {
  const { message, session } = ctx;

  session.count = 1;
  session.type = "receipt"; // here we hijack the receipt flow to present the user the inline keyboard
  session.root = message.message_id;

  try {
    session.metadata = {
      date: moment().toISOString(),
      payee: "",
      currency: "SGD",
      total: 0,
      category: "",
      payment_method: "",
    };
    await ctx.reply("Tell me more about your expense", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: receiptInlineKeyboard,
      },
      reply_parameters: {
        message_id: message.message_id,
      },
    });
  } catch (e) {
    await ctx.reply(`Something went wrong: ${e}`);
  }
});

bot.on(message("text"), async (ctx) => {
  await handleOnMessage(ctx);
});

bot.on(message("photo"), async (ctx) => {
  await handleOnPhoto(ctx);
});

bot.on(callbackQuery("data"), async (ctx) => {
  const { callbackQuery, session } = ctx;
  const messageId = callbackQuery.message?.message_id;
  if (session.metadata) {
    await ctx.sendChatAction("typing");
    let reply = "Request cancelled";
    switch (callbackQuery.data) {
      case "date":
      case "payee":
      case "currency":
      case "total":
      case "category":
      case "payment_method":
        let replyId;
        if (
          callbackQuery.data === "payment_method" ||
          callbackQuery.data === "category"
        ) {
          let definitions;
          try {
            definitions = await getDefintions();
          } catch (e) {
            console.error("Failed to fetch definitions for edit flow", e);
          }
          let replyMarkup;
          let methodsKeyboard: KeyboardButton[][] = [];
          const isPaymentMethod = callbackQuery.data === "payment_method";
          if (definitions) {
            let prefix = "";
            if (ctx.chat!.type !== "private") {
              prefix = "@" + ctx.botInfo.username + " ";
            }
            if (isPaymentMethod) {
              methodsKeyboard = definitions.cards.map((card: string) => [
                { text: prefix + card },
              ]);
            } else {
              methodsKeyboard = definitions.categories.map((category: string) => [
                { text: prefix + category },
              ]);
            }
            console.debug(methodsKeyboard);
            if (methodsKeyboard.length > 0) {
              replyMarkup = {
                reply_markup: {
                  keyboard: methodsKeyboard,
                  one_time_keyboard: true,
                  resize_keyboard: true,
                },
              };
            }
          }
          const editLabel = isPaymentMethod ? "payment method" : "category";
          replyId = (
            await ctx.reply(
              replyMarkup
                ? `Choose a ${editLabel} or enter one`
                : `Editing ${editLabel}:`,
              replyMarkup ?? {
                reply_markup: {
                  force_reply: true,
                },
              },
            )
          ).message_id;
        } else {
          replyId = (
            await ctx.reply(`Editing ${ctx.callbackQuery.data}:`, {
              reply_parameters: {
                message_id: messageId || 0,
                allow_sending_without_reply: true,
              },
              reply_markup: {
                force_reply: true,
              },
            })
          ).message_id;
        }
        session.metadata.edit = {
          originId: messageId,
          field: callbackQuery.data,
          replyId,
        };
        break;
      case "validate":
        if (session.metadata) {
          const { date } = session.metadata;
          const { validDate, month } = getDateAndMonth(date);
          await ctx.reply(
            `Date parsed as ${validDate.toISOString()} for month ${month}`,
          );
        }
        break;
      case "edit":
        if (session.metadata) {
          const editPromptMsg = await ctx.reply(
            "Reply to this message with your corrections. For example:\n- \"change category to Dining\"\n- \"payee should be KFC\"\n- \"paid with OCBC365\"",
            {
              reply_parameters: {
                message_id: messageId || 0,
                allow_sending_without_reply: true,
              },
              reply_markup: {
                force_reply: true,
              },
            },
          );
          session.metadata.editPromptId = editPromptMsg.message_id;
          // Delete the original message with buttons to prevent re-clicking
          try {
            await ctx.deleteMessage(messageId);
          } catch {}
        }
        break;
      case "submit":
        if (session.metadata) {
          const {
            date,
            payee,
            total,
            currency,
            category,
            payment_method: paymentMethod,
            person,
          } = session.metadata;
          const { validDate, month } = getDateAndMonth(date);
          // TODO: Convert currencies accordingly
          console.info(`Submitting expense for ${month}...`);
          const result = await addExpense(
            month,
            validDate.toISOString(),
            payee,
            category,
            total,
            paymentMethod,
            person || ctx.from?.first_name || "bot",
          );
          if (result.ok) {
            reply = `✅ Expense submitted! \`\`\`json\n${JSON.stringify(session.metadata)}\n\`\`\``;
          } else {
            reply = `Something went wrong: ${result.error}`;
          }
        }
      case "cancel":
        console.info("Clearing session...");
        clearSession(ctx);
        await ctx.editMessageText(reply, {
          parse_mode: "Markdown",
          reply_markup: undefined,
        });
        break;
    }
  } else {
    await ctx.deleteMessage(messageId);
  }
  await ctx.answerCbQuery();
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { body, query } = req;
    if (query.setWebhook === "true") {
      const webhookUrl = `${BASE_PATH}/api/telegram`;
      const isSet = await bot.telegram.setWebhook(webhookUrl);
      console.log(`Set webhook to ${webhookUrl}: ${isSet}`);
    } else {
      await bot.handleUpdate(body);
    }
  } catch (error) {
    console.error(error);
  }

  res.status(200).json({ ok: true });
}
export async function handleStartCommand(ctx: ContextWithSession) {
  const { message, from } = ctx;
  const reply = `Hello, ${from!.first_name} (${from!.id})`;

  const didReply = await ctx.reply(reply, {
    reply_parameters: {
      message_id: message?.message_id || 0,
      allow_sending_without_reply: true,
    },
  });

  if (didReply) {
    console.log(`Reply to /start command sent successfully.`);
  } else {
    console.error(
      `Something went wrong with the /start command. Reply not sent.`,
    );
  }
  clearSession(ctx);
}

export async function handleOnMessage(
  ctx: ContextWithSession<Update.MessageUpdate<Message.TextMessage>>,
) {
  const { message, session } = ctx;


  await ctx.sendChatAction("typing");

  // Scrub @username from message text if included
  let text = message.text;
  const mentionEntity = getUsernameMentionEntity(
    ctx.botInfo.username,
    text,
    ctx.message.entities,
  );
  if (mentionEntity) {
    text = text.slice(mentionEntity.offset + mentionEntity.length + 1);
  }

  // Check if this is a correction reply to an edit prompt
  if (
    session.metadata?.editPromptId &&
    message.reply_to_message?.message_id === session.metadata.editPromptId
  ) {
    await ctx.sendChatAction("typing");
    const loadingMsg = await ctx.reply("Updating expense...", {
      reply_parameters: {
        message_id: message.message_id,
        allow_sending_without_reply: true,
      },
    });

    try {
      // Use AI to parse correction intent
      const correctionPrompt = `The user wants to correct an expense. Current expense data:
${JSON.stringify(session.metadata, null, 2)}

User's correction: "${text}"

Extract what fields the user wants to change. Respond ONLY with valid JSON (no markdown):
{"payee": "new value or null", "category": "new value or null", "payment_method": "new value or null", "total": number or null, "currency": "new value or null", "date": "YYYY-MM-DD or null"}

Only include fields the user wants to change. Return null for fields they didn't mention.`;

      const correctionResponse = await completeChat(correctionPrompt, [
        { role: "system", content: "You are an expense correction assistant." },
      ]);

      if (correctionResponse) {
        let jsonString = correctionResponse.trim();
        if (jsonString.startsWith("```json")) {
          jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonString.startsWith("```")) {
          jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const corrections = JSON.parse(jsonString);

        // Apply corrections to session.metadata
        if (corrections.payee) session.metadata.payee = corrections.payee;
        if (corrections.category) session.metadata.category = corrections.category;
        if (corrections.payment_method)
          session.metadata.payment_method = corrections.payment_method;
        if (corrections.total) session.metadata.total = corrections.total;
        if (corrections.currency) session.metadata.currency = corrections.currency;
        if (corrections.date) session.metadata.date = moment(corrections.date).toISOString();

        // Delete original messages
        const editPromptId = session.metadata.editPromptId;
        try {
          await ctx.deleteMessage(editPromptId);
          await ctx.deleteMessage(message.message_id);
          await ctx.deleteMessage(loadingMsg.message_id);
        } catch {}

        // Clear edit prompt tracking
        delete session.metadata.editPromptId;

        // Show updated expense
        await ctx.reply(
          `Updated expense:\n\`\`\`json\n${JSON.stringify(session.metadata, null, 2)}\n\`\`\``,
          {
            parse_mode: "Markdown",
            reply_parameters: {
              message_id: session?.root || 0,
              allow_sending_without_reply: true,
            },
            reply_markup: {
              inline_keyboard: receiptInlineKeyboard,
            },
          },
        );
      } else {
        await ctx.reply("Failed to parse correction. Please try again or use the field buttons.");
        try {
          await ctx.deleteMessage(loadingMsg.message_id);
        } catch {}
      }
    } catch (e) {
      console.error("Error parsing correction:", e);
      await ctx.reply("Failed to parse correction. Please try again or use the field buttons.");
      try {
        await ctx.deleteMessage(loadingMsg.message_id);
      } catch {}
    }
    return;
  }

  if (session.metadata?.edit) {
    session.type = "receipt";
    const { field, replyId, originId } = session.metadata.edit;
    session.metadata[field] = text;
    await ctx.deleteMessage(originId);
    await ctx.deleteMessage(replyId);
    session.metadata.edit = undefined;
    try {
      await ctx.deleteMessage(message!.message_id);
    } catch {}
    await ctx.replyWithMarkdown(
      `\`\`\`json\n${JSON.stringify(session.metadata)}\n\`\`\``,
      {
        reply_parameters: {
          message_id: session?.root || 0,
          allow_sending_without_reply: true,
        },
        reply_markup: {
          inline_keyboard: receiptInlineKeyboard,
          remove_keyboard: true,
        },
      },
    );
  } else {
    session.type = "message";

    // Always treat text as an expense attempt; no chat fallback
    await ctx.sendChatAction("typing");
    const loadingMsg = await ctx.reply("Working on your expense...", {
      reply_parameters: {
        message_id: message.message_id,
        allow_sending_without_reply: true,
      },
    });

    const fallbackMessage =
      "I can only handle expenses right now. Please send something like 'spent 50 at KFC with OCBC365' or share a receipt photo.";

    try {
      const expenseData = await parseExpense(text, ctx.from?.id.toString());

      if (expenseData.ok && expenseData.expense) {
        const { expense } = expenseData;
        // Store in session and show confirmation buttons
        session.type = "receipt";
        session.root = message.message_id;
        session.metadata = {
          date: expense.date,
          payee: expense.payee,
          currency: expense.currency,
          total: expense.total,
          category: expense.category,
          payment_method: expense.payment_method,
          person: expense.person,
        };
        await ctx.reply(
          `Please verify the details of the expense:\n\`\`\`json\n${JSON.stringify(session.metadata, null, 2)}\n\`\`\``,
          {
            parse_mode: "Markdown",
            reply_parameters: {
              message_id: message.message_id,
            },
            reply_markup: {
              inline_keyboard: receiptInlineKeyboard,
            },
          },
        );
      } else {
        console.debug(`NLP expense parsing failed: ${expenseData.error}`);
        await ctx.reply(fallbackMessage, {
          reply_parameters: {
            message_id: message.message_id,
          },
        });
      }
    } catch (e) {
      console.error("Error parsing NLP expense:", e);
      await ctx.reply(fallbackMessage, {
        reply_parameters: {
          message_id: message.message_id,
        },
      });
    } finally {
      try {
        await ctx.deleteMessage(loadingMsg.message_id);
      } catch {}
    }
  }
}

export async function handleOnPhoto(
  ctx: ContextWithSession<Update.MessageUpdate<Message.PhotoMessage>>,
) {
  const { message, session } = ctx;

  await ctx.sendChatAction("typing");

  session.count = 1;
  session.type = "receipt";

  const loadingMessageId = (
    await ctx.reply("Working on your receipt. Please give me a moment...")
  ).message_id;

  const photo = message.photo.pop();
  console.info(`Photo received with ID ${photo!.file_id}`);
  const fileLink = await ctx.telegram.getFileLink(photo!.file_id);
  console.debug(`Original file link: ${fileLink.toString()}`);
  
  // In test envs, try both with and without /test in path
  let fetchUrl = fileLink.toString();
  if (IS_TEST_ENV && !fetchUrl.includes("/test/test/")) {
    // Try adding /test path if it's not already there
    fetchUrl = fetchUrl.replace("/file/bot", "/file/bot/test/");
    console.debug(`[TESTENV] Adjusted file link: ${fetchUrl}`);
  }
  
  // Download photo as base64 file
  let file = await fetch(fetchUrl);
  
  // If 404 in test env, try without the /test prefix
  if (!file.ok && IS_TEST_ENV && fetchUrl.includes("/file/bot/test/")) {
    console.debug("[TESTENV] First attempt failed, trying without /test prefix");
    fetchUrl = fileLink.toString();
    file = await fetch(fetchUrl);
  }
  
  if (!file.ok) {
    console.error(`Failed to fetch image: ${file.status} ${file.statusText} from ${fetchUrl}`);
    await ctx.reply("Failed to download image from Telegram");
    return;
  }
  const arrayBuffer = await file.arrayBuffer();
  console.debug(`Downloaded image: ${arrayBuffer.byteLength} bytes`);
  const base64file = Buffer.from(arrayBuffer).toString("base64");
  console.debug(`Base64 length: ${base64file.length} characters`);
  console.debug(`Final successful URL: ${fetchUrl}`);
  await ctx.sendChatAction("typing");
  
  // Fetch definitions for receipt analysis
  let definitions = null;
  try {
    definitions = await getDefintions();
  } catch (e) {
    console.warn("Failed to fetch definitions for receipt analysis:", e);
  }
  
  // Pass file to GPT for analysis
  const {
    ok,
    id,
    usage,
    json: response,
    error,
  } = await analyzeReceipt(
    base64file,
    definitions
      ? { categories: definitions.categories || [], cards: definitions.cards || [] }
      : undefined,
  );

  let reply = "Failed to parse image";
  let hideInlineKeyboardMarkup = true;
  let parseMode: "Markdown" | undefined = "Markdown";

  if (ok) {
    const totalTokens = (usage as any)?.total_tokens ?? (usage as any)?.totalTokenCount;
    if (totalTokens) {
      console.info(`[${id}] used ${totalTokens}`);
    }

    if (response) {
      console.debug(response);
      try {
        // Strip markdown code blocks if present
        let jsonString = response.trim();
        if (jsonString.startsWith("```json")) {
          jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonString.startsWith("```")) {
          jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        
        const {
          date,
          payee,
          currency,
          total,
          category,
          payment_method,
          error,
        } = JSON.parse(jsonString);
        session.metadata = {
          date: moment(date).toISOString(),
          payee,
          currency,
          total,
          category,
          payment_method,
        };
        if (error) {
          throw new Error(error);
        }
        reply = `Please verify the details of the expense: \`\`\`\n${jsonString}\n\`\`\``;
        hideInlineKeyboardMarkup = false;
      } catch (e) {
        console.error("Failed to parse response from GPT:", e);
        let error;
        if (e instanceof SyntaxError) {
          error = response;
        }
        reply = `Something went wrong: \`\`\`\n${error || e}\n\`\`\``;
          parseMode = undefined;
      }
    }
  } else if (error) {
    const isQuotaError =
      (typeof error === "object" && (error as any)?.status === 429) ||
      `${error}`.toLowerCase().includes("quota") ||
      `${error}`.toLowerCase().includes("too many requests");

    if (isQuotaError) {
      reply =
        "Gemini receipt parsing is temporarily unavailable due to quota limits. Please try again in a minute, or use NLP to tell the bot your expense details (e.g. 'spent 12.50 at cafe with Visa').";
    } else {
      reply += `: ${error}`;
    }
    parseMode = undefined;
  }

  await ctx.deleteMessage(loadingMessageId);
  await ctx.reply(reply, {
    parse_mode: parseMode,
    reply_markup: {
      inline_keyboard: hideInlineKeyboardMarkup ? [] : receiptInlineKeyboard,
    },
    reply_parameters: {
      message_id: message.message_id,
    },
  });
}

function clearSession(ctx: ContextWithSession) {
  ctx.session = {
    count: 0,
    type: "default",
    metadata: undefined,
    root: undefined,
  };
  return ctx;
}
