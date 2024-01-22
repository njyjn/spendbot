import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export async function getService() {
  return google.sheets({
    version: "v4",
    auth: new google.auth.GoogleAuth({
      credentials: JSON.parse(
        process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || ""
      ),
      scopes: SCOPES,
    }),
  });
}
