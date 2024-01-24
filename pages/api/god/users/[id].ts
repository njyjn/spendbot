import getDb from "@/lib/kysely";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

const db = getDb();

export default withApiAuthRequired(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const id = parseInt(req.query.id!.toString());

  let data;
  try {
    if (req.method === "DELETE") {
      await db.deleteFrom("users").where("id", "=", id).execute();
      data = {
        ok: true,
      };
    } else if (req.method === "PATCH") {
      const { first_name, last_name, federation_id, telegram_id } = req.body;
      await db
        .updateTable("users")
        .set({
          first_name,
          last_name,
          federation_id,
          telegram_id,
        })
        .where("id", "=", id)
        .executeTakeFirst();
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
