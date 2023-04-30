import { NextApiRequest, NextApiResponse } from "next";
import { getService } from "../../utils/google";
import moment from "moment";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {  
  const service = await getService();

  let { month } = req.query;

  try {
    if (!month) {
      month = moment().format("MMM YY");
    } else {
      month = moment(month.toString(), 'MMM YY', true).format("MMM YY");
    }
    const lastMonth = moment(month, 'MMM YY', true).subtract(1, 'months').format("MMM YY");
  
    let data;

    try {
      const thisMonthSheetData = (await service.spreadsheets.get({
        spreadsheetId: SHEET_ID,
        ranges: [
          `${month}!A1:A2`
        ],
        includeGridData: false,
      })).data.sheets;
      if (thisMonthSheetData && thisMonthSheetData[0].properties?.sheetId) {
        return res.status(400).json({ error: "Sheet for requested month already exists" });
      }
    } catch (e: any) {}

    const lastMonthSheetData = (await service.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      ranges: [
        `${lastMonth}!A1:A2`
      ],
      includeGridData: false,
    })).data.sheets;
    if (lastMonthSheetData) {
      const lastMonthSheetId = lastMonthSheetData[0].properties?.sheetId || 0;
    
      const duplicateResult = await service.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [
            {
              duplicateSheet: {
                sourceSheetId: lastMonthSheetId,
                insertSheetIndex: 0,
                newSheetName: month,
              },
            },
          ],
          includeSpreadsheetInResponse: false,
          responseIncludeGridData: false,
        },
      });

      if (duplicateResult.data.replies && duplicateResult.data.replies[0].duplicateSheet?.properties?.sheetId) {
        const clearRange = `${month}!B2:G`;
        const clearResult = await service.spreadsheets.values.clear({
          spreadsheetId: SHEET_ID,
          range: clearRange,
        });
        if (clearResult.data.clearedRange?.includes(month)) {
          data = { ok: true };
        };
      };
    };

    if (data) {
      return res.status(200).json(data);
    }
    return res.status(400).json({ error: "Bad request" });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ errors: e.errors });
  }
});
