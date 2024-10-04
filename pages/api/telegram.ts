import { NextApiRequest, NextApiResponse } from "next";
import { Telegraf, session, type Context } from "telegraf";
import { Message, Update } from "@telegraf/types";
import {
  InlineKeyboardButton,
  KeyboardButton,
} from "telegraf/typings/core/types/typegram";
import { message, callbackQuery } from "telegraf/filters";
import { analyzeReceipt, completeChat } from "../../lib/openai";
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

bot.command("expense", async (ctx) => {
  const { message, session } = ctx;

  session.count = 1;
  session.type = "receipt";
  session.root = message.message_id;

  try {
    const contents = message.text.split("/expense ")[1];
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
      reply_to_message_id: message?.message_id,
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
          const definitions = await getDefintions();
          let replyMarkup;
          let methodsKeyboard: KeyboardButton[][];
          if (definitions) {
            if (callbackQuery.data === "payment_method") {
              methodsKeyboard = definitions.cards.map((card) => [
                { text: card },
              ]);
            } else {
              methodsKeyboard = definitions.categories.map((category) => [
                { text: category },
              ]);
            }
            replyMarkup = {
              reply_markup: {
                keyboard: methodsKeyboard,
                one_time_keyboard: true,
              },
            };
          }
          replyId = (
            await ctx.reply(`Choose a payment method or enter one`, replyMarkup)
          ).message_id;
        } else {
          replyId = (
            await ctx.reply(`Editing ${ctx.callbackQuery.data}:`, {
              reply_to_message_id: messageId,
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
      case "submit":
        if (session.metadata) {
          const {
            date,
            payee,
            total,
            currency,
            category,
            payment_method: paymentMethod,
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
            ctx.from?.first_name || "bot",
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
  let reply = `Hello, ${from!.first_name} (${from!.id})`;

  const didReply = await ctx.reply(reply, {
    reply_to_message_id: message?.message_id,
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

  session.count++;
  session.type = "message";

  if (session.metadata?.edit) {
    const { field, replyId, originId } = session.metadata.edit;
    session.metadata[field] = message.text;
    await ctx.deleteMessage(originId);
    await ctx.deleteMessage(replyId);
    session.metadata.edit = undefined;
    await ctx.deleteMessage(message!.message_id);
    await ctx.replyWithMarkdown(
      `\`\`\`json\n${JSON.stringify(session.metadata)}\n\`\`\``,
      {
        reply_to_message_id: session.root,
        reply_markup: {
          inline_keyboard: receiptInlineKeyboard,
          remove_keyboard: true,
        },
      },
    );
  } else {
    const response = await completeChat(
      message.text,
      session.metadata?.completions,
    );
    if (response) {
      await ctx.reply(response, {
        reply_to_message_id: message.message_id,
        reply_markup: {
          remove_keyboard: true,
        },
      });
      if (!session.metadata?.completions) {
        const completions = [];
        completions.push({
          role: "system",
          content: "You are a helpful assistant.",
        });
        if (session.metadata) {
          session.metadata.completions = completions;
        } else {
          session.metadata = {
            completions: completions,
          };
        }
      } else {
        if (session.metadata.completions.length > 9) {
          session.metadata.completions.shift();
          session.metadata.completions.shift();
        }
      }
      session.metadata.completions.push({
        role: "assistant",
        content: response,
      });
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
  // In test envs, the file link does not include the /test path as it should
  if (IS_TEST_ENV) {
    const pathComponents = fileLink.pathname.split("/");
    pathComponents.splice(3, 0, "test");
    fileLink.pathname = pathComponents.join("/");
    console.log(`[TESTENV] File link manually corrected`);
  }
  // Download photo as base64 file
  const file = await fetch(fileLink);
  const base64file = Buffer.from(await file.arrayBuffer()).toString("base64");
  console.debug(fileLink);
  await ctx.sendChatAction("typing");
  // Pass file to GPT for analysis
  const {
    ok,
    id,
    usage,
    json: response,
    error,
  } = await analyzeReceipt(base64file);
  let reply = "Failed to parse image";
  let hideInlineKeyboardMarkup = true;
  if (ok) {
    console.info(`[${id}] used ${usage!.total_tokens}`);

    if (response) {
      console.debug(response);
      try {
        const {
          date,
          payee,
          currency,
          total,
          category,
          payment_method,
          error,
        } = JSON.parse(response);
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
        reply = `Please verify the details of the expense: \`\`\`\n${response}\n\`\`\``;
        hideInlineKeyboardMarkup = false;
      } catch (e) {
        console.error("Failed to parse response from GPT:", e);
        let error;
        if (e instanceof SyntaxError) {
          error = response;
        }
        reply = `Something went wrong: \`\`\`\n${error || e}\n\`\`\``;
      }
    }
  } else if (error) {
    reply += `: ${error}`;
  }

  await ctx.deleteMessage(loadingMessageId);
  await ctx.reply(reply, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: hideInlineKeyboardMarkup ? [] : receiptInlineKeyboard,
    },
    reply_to_message_id: message?.message_id,
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
