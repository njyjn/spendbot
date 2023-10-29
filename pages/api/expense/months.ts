import { NextApiRequest, NextApiResponse } from "next";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { getService } from "../../../utils/google";
import moment from "moment";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export interface Expense {
  date: string;
  item: string;
  category: string;
  cost: number;
  card: string;
  person: string;
}

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const service = await getService();

  let data;

  try {
    if (req.method === "GET") {
      const result = await service.spreadsheets.get({
        spreadsheetId: SHEET_ID,
      });
      data = {
        months: result.data.sheets
          ?.map((s) => {
            return s.properties?.title;
          })
          .filter((m) => moment(m, "MMM YY", true).isValid()),
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
