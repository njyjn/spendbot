const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || "";

export interface ExpenseNotification {
  date: string;
  payee: string;
  category: string;
  amount: number;
  currency: string;
  payment_method: string;
  person: string;
}

export async function notifySlackExpense(expense: ExpenseNotification) {
  if (!SLACK_WEBHOOK_URL) {
    console.debug("Slack webhook URL not configured, skipping notification");
    return;
  }

  try {
    const payload = {
      text: `💰 New Expense Recorded`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "New Expense",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Payee:*\n${expense.payee}`,
            },
            {
              type: "mrkdwn",
              text: `*Amount:*\n${expense.currency} ${expense.amount}`,
            },
            {
              type: "mrkdwn",
              text: `*Category:*\n${expense.category}`,
            },
            {
              type: "mrkdwn",
              text: `*Payment Method:*\n${expense.payment_method}`,
            },
            {
              type: "mrkdwn",
              text: `*Date:*\n${new Date(expense.date).toLocaleDateString()}`,
            },
            {
              type: "mrkdwn",
              text: `*Person:*\n${expense.person}`,
            },
          ],
        },
      ],
    };

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `Failed to send Slack notification: ${response.status} ${response.statusText}`,
      );
    } else {
      console.debug("Slack notification sent successfully");
    }
  } catch (e) {
    console.error("Error sending Slack notification:", e);
  }
}
