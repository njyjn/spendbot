import { NextApiRequest, NextApiResponse } from "next";
import moment from "moment";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { getService } from "../../utils/google";
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
  res: NextApiResponse
) {
  const service = await getService();

  let data;

  try {
    if (req.method === "GET") {
      const result = await service.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "'Export'!A2:H",
        majorDimension: "COLUMNS",
      });
      // console.info(result.data)
      data = {
        total: result.data.values?.at(0)?.at(0),
        allocations: result.data.values?.at(1)?.map((v, i) => {
          return {
            allocation: v,
            absolute: result.data.values?.at(2)?.at(i),
            relative: result.data.values?.at(3)?.at(i) || 0,
          };
        }),
        goals: result.data.values?.at(4)?.map((v, i) => {
          return {
            goal: v,
            end: result.data.values?.at(5)?.at(i),
            percent: result.data.values?.at(6)?.at(i),
            value: result.data.values?.at(7)?.at(i),
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
