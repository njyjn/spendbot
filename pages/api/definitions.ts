import { NextApiRequest, NextApiResponse } from "next";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { getService } from "../../lib/google";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  let data;
  try {
    if (req.method === "GET") {
      data = await getDefintions();
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

export async function getDefintions() {
  const service = await getService();

  const result = await service.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'Definitions'!A1:E`,
    majorDimension: "COLUMNS",
  });

  let data;

  if (result.data.values) {
    data = {
      cards: result.data.values[0].slice(1).sort(),
      categories: result.data.values[1].slice(1).sort(),
      persons: result.data.values[2].slice(1).sort(),
      fx: result.data.values[3].slice(1).map((f, i) => {
        return {
          currency: f,
          rate: result.data.values?.at(4)?.slice(1).at(i),
        };
      }),
    };
  }
  return data;
}
