import getDb from "@/lib/kysely";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

const db = getDb();

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  let data;
  try {
    if (req.method === "GET") {
      data = await db.selectFrom("users").selectAll().execute();
    } else if (req.method === "POST") {
      const { federation_id, telegram_id, first_name, last_name } = req.body;
      await db
        .insertInto("users")
        .values([{ federation_id, telegram_id, first_name, last_name }])
        .execute();
      data = {
        ok: true,
      };
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
