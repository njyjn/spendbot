import { NextApiRequest, NextApiResponse } from "next";
import moment from "moment";
import { google } from "googleapis";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const service = google.sheets({
    version: "v4",
    auth: await new google.auth.GoogleAuth({
      credentials: JSON.parse(
        process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || ""
      ),
      scopes: SCOPES,
    }).getClient(),
  });
  const { month } = req.query;

  let data;

  try {
    if (req.method === "GET") {
      const result = await service.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${month}'!A1:A`,
      });
      data = {
        month: month,
        total: result.data.values?.flat()[1],
      };
    } else if (req.method === "POST") {
      const { date, item, category, cost, card } = req.body;
      const result = await service.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `'${month}'!B2:F`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          range: `'${month}'!B2:F`,
          majorDimension: "ROWS",
          values: [
            [null, moment(date).format("M/D/YY"), item, category, cost, card],
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
