import { NextApiRequest, NextApiResponse } from "next";
import { Telegraf } from "telegraf";
import TelegrafContext from "telegraf/typings/context";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const BASE_PATH = process.env.BASE_PATH || "";

const bot = new Telegraf(BOT_TOKEN, {
  telegram: {
    testEnv: true,
  },
});

bot.start(async (ctx) => {
  await handleStartCommand(ctx);
});

bot.on("message", async (ctx) => {
  await handleOnMessage(ctx);
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

export async function handleStartCommand(ctx: TelegrafContext) {
  let reply = "Hello";
  const { message } = ctx;

  const didReply = await ctx.reply(reply, {
    reply_to_message_id: message?.message_id,
    reply_markup: {
      keyboard: [
        [
          {
            text: "Menu",
            web_app: {
              url: `${BASE_PATH}/telegram`,
            },
          },
        ],
      ],
    },
  });

  if (didReply) {
    console.log(`Reply to /start command sent successfully.`);
  } else {
    console.error(
      `Something went wrong with the /start command. Reply not sent.`,
    );
  }
}

export async function handleOnMessage(ctx: TelegrafContext) {
  const { message } = ctx;

  const isGroup =
    message?.chat.type === "group" || message?.chat.type === "supergroup";

  if (isGroup) {
    await ctx.reply("This bot is only available in private chats.");
    return;
  }

  const telegramUsername = message?.from?.username;
  const reply = "a message was sent";

  await ctx.reply(reply, {
    reply_to_message_id: message?.message_id,
  });
}
