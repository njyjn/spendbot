import { NextApiRequest, NextApiResponse } from "next";
import moment from "moment";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { getService } from "../../utils/google";
import currency from "currency.js";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const service = await getService();
  const { month } = req.query;

  let data;

  try {
    if (req.method === "GET") {
      const result = await service.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${month}'!A1:G`,
      });
      data = {
        month: month,
        total: result.data.values?.at(0)?.at(0),
        expenses: result.data.values?.slice(1).map((e) => {
          e.shift();
          e[3] = currency(e[3]);
          return e;
        }),
      };
    } else if (req.method === "POST") {
      const { date, item, category, cost, card, person } = req.body;
      const result = await service.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `'${month}'!B1:G`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          range: `'${month}'!B1:G`,
          majorDimension: "ROWS",
          values: [
            [
              null,
              moment(date).format("M/D/YY"),
              item,
              category,
              cost,
              card,
              person,
            ],
          ],
        },
      });
      data = {
        ok: result.status === 200,
      };
    }
    if (data) {
      return res.status(200).json(data);
    }
    return res.status(400).json({ error: "Bad request" });
  } catch (e: any) {
    return res.status(500).json({ errors: e.errors });
  }
});
