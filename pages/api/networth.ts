import { NextApiRequest, NextApiResponse } from "next";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { getService } from "../../lib/google";
import currency from "currency.js";

const SHEET_ID = process.env.GOOGLE_SHEET_ID_NETWORTH;

// Cache networth data with TTL
let cachedNetworthData: Networth | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface Networth {
  total: number;
  allocations: Allocation[];
  tia: number;
}

export interface Allocation {
  allocation: string;
  value: number;
  absolute: number;
  target: number;
  relative: number;
}

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const service = await getService();

  let data;

  try {
    if (req.method === "GET") {
      // Check cache first
      const now = Date.now();
      if (cachedNetworthData && now - cacheTimestamp < CACHE_TTL_MS) {
        console.debug("Using cached networth data");
        return res.status(200).json(cachedNetworthData);
      }

      console.debug("Fetching fresh networth data from sheet");
      const result = await service.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "'Export'!A1:H11",
        majorDimension: "ROWS",
      });

      const values = result.data.values || [];

      // Parse header and data rows
      // Row 0: Headers (Total, Allocations, Value, Absolute, Target, Relative, TIA, [TIA value])
      // Row 1: $2,042,272.31 | Allocation | Value | Absolute | Target | Relative | TIA | 1,225,059.19
      // Rows 2-10: Allocation entries (Bonds | 197,376.95 | 0.10 | 0.09 | 16.11% | ... )

      const totalCell = values[1]?.[0]; // " $ 2,042,272.31 "
      const tiaValue = values[1]?.[7]; // TIA value (e.g., 1,225,059.19)

      // Parse total (remove $ and spaces, convert to number)
      const total = totalCell
        ? currency(
            totalCell
              .toString()
              .replace(/[$,\s]/g, "")
              .trim(),
          ).value
        : 0;

      // Parse TIA value
      const tia = tiaValue
        ? currency(
            tiaValue
              .toString()
              .replace(/[$,\s]/g, "")
              .trim(),
          ).value
        : 0;

      // Parse allocations from rows 2-10
      // Column structure: [0] = empty, [1] = allocation name, [2] = value, [3] = absolute, [4] = target, [5] = relative
      const allocations: Allocation[] = [];
      for (let i = 2; i < values.length; i++) {
        const row = values[i];
        if (row && row[1]) {
          // row[1] has the allocation name
          allocations.push({
            allocation: row[1].trim(),
            value: row[2]
              ? currency(row[2].toString().replace(/[$,]/g, "")).value
              : 0,
            absolute: row[3] ? parseFloat(row[3].toString()) : 0,
            target: row[4] ? parseFloat(row[4].toString()) : 0,
            relative: row[5]
              ? parseFloat(row[5].toString().replace("%", ""))
              : 0,
          });
        }
      }

      data = {
        total,
        allocations,
        tia,
      };

      // Update cache
      cachedNetworthData = data;
      cacheTimestamp = Date.now();
    }

    if (data) {
      return res.status(200).json(data);
    }
    return res.status(400).json({ error: "Bad request" });
  } catch (e: any) {
    console.error("Failed to fetch networth data:", e);
    return res.status(500).json({ errors: e.errors, message: e.message });
  }
});
