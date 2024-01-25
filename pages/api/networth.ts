import { NextApiRequest, NextApiResponse } from "next";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { getService } from "../../lib/google";
import currency from "currency.js";

const SHEET_ID = process.env.GOOGLE_SHEET_ID_NETWORTH;

export interface Networth {
  total: number;
  allocations: Allocation[];
}

export interface Allocation {
  allocation: string;
  absolute: number;
  relative: number;
}

export interface Goal {
  goal: string;
  end: number;
  percent: number;
  value: number;
}

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const service = await getService();

  let data;

  try {
    if (req.method === "GET") {
      const result = await service.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "'Export'!A2:I",
        majorDimension: "COLUMNS",
      });
      data = {
        total: result.data.values?.at(0)?.at(0),
        allocations: result.data.values?.at(1)?.map((v, i) => {
          return {
            allocation: v,
            absolute: currency(result.data.values?.at(2)?.at(i) || 0.0).value,
            relative: currency(result.data.values?.at(3)?.at(i) || 0.0).value,
          };
        }),
        goals: result.data.values?.at(5)?.map((v, i) => {
          return {
            goal: v,
            end: currency(result.data.values?.at(6)?.at(i) || 0).value,
            percent: currency(result.data.values?.at(7)?.at(i) || 0).value,
            value: currency(result.data.values?.at(8)?.at(i) || 0).value,
          };
        }),
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
