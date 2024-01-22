import { NextApiRequest, NextApiResponse } from "next";
import moment from "moment";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { getService } from "../../utils/google";
import currency from "currency.js";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const DEFAULT_RANGE_NOTATION = "!A1:G";
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
  res: NextApiResponse,
) {
  const service = await getService();
  const { month, lookback } = req.query;

  let data;

  try {
    if (req.method === "GET") {
      if (!month) {
        return res.status(400).json({ error: "Bad request" });
      }

      let result, currentValues, lastMonthTotal, lookbackValues;

      if (lookback) {
        let retry = true;
        let lookbackInt = parseInt(lookback.toString());
        while (retry) {
          try {
            const currentMonth = moment(month, "MMM YY");
            const lookbackMonthsStrings = [...Array(lookbackInt)].map(
              (_, i) =>
                `${currentMonth
                  .clone()
                  .subtract(i + 1, "months")
                  .format("MMM YY")}${DEFAULT_RANGE_NOTATION}`,
            );
            result = await service.spreadsheets.values.batchGet({
              spreadsheetId: SHEET_ID,
              ranges: [
                `'${month}'${DEFAULT_RANGE_NOTATION}`,
                ...lookbackMonthsStrings,
              ],
            });
            retry = false;
            currentValues = result.data.valueRanges?.at(0)?.values;
            lastMonthTotal = result.data.valueRanges
              ?.at(1)
              ?.values?.at(0)
              ?.at(0);
            lookbackValues = result.data.valueRanges?.slice(1);
          } catch {
            if (lookbackInt === 0) {
              result = await service.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: `'${month}'${DEFAULT_RANGE_NOTATION}`,
              });
              currentValues = result.data.values;
              retry = false;
            } else {
              lookbackInt -= 1;
            }
          }
        }
      } else {
        result = await service.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `'${month}'${DEFAULT_RANGE_NOTATION}`,
        });
        currentValues = result.data.values;
      }
      data = {
        month: month,
        total: currentValues?.at(0)?.at(0),
        expenses: parseValues(currentValues),
        lastMonthTotal: lastMonthTotal || null,
        lookback:
          lookbackValues?.map((value) => {
            return {
              month: value.range?.match(/\w+\s{1}\d+/)?.at(0),
              values: parseValues(value.values),
            };
          }) || null,
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

function parseValues(values: any[][] | null | undefined) {
  return values
    ?.slice(1)
    .filter((e) => !!e[1])
    .map((e) => {
      e.shift();
      return {
        date: e[0],
        item: e[1],
        category: e[2],
        cost: currency(e[3]) as unknown as number,
        card: e[4],
        person: e[5],
      } as Expense;
    })
    .sort((a, b) => {
      return moment(b.date, "l").unix() - moment(a.date, "l").unix();
    });
}
