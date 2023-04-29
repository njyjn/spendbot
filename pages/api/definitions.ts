import { NextApiRequest, NextApiResponse } from "next";
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
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || ''),
      scopes: SCOPES,
    }).getClient(),
  });

  let data;

  try {
    if (req.method === "GET") {
      const result = await service.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'Definitions'!A1:B`,
        majorDimension: "COLUMNS",
      });

      if (result.data.values) {
        data = {
          cards: result.data.values[0].slice(1).sort(),
          categories: result.data.values[1].slice(1).sort(),
        };
      }
    }
    if (data) {
      return res.status(200).json(data);
    }
    return res.status(400).json({ error: "Bad request" });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ errors: e.errors });
  }
});
