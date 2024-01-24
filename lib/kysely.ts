import { createKysely } from "@vercel/postgres-kysely";
import { Generated, ColumnType, sql } from "kysely";

interface UserTable {
  id: Generated<number>;
  federation_id: string | null;
  telegram_id: string | null;
  first_name: string;
  last_name: string | null;
  modified_at: ColumnType<Date, string | undefined, never>;
}

interface Database {
  users: UserTable;
}

export default function getDb() {
  return createKysely<Database>();
}

export async function seedDb(table: string) {
  const db = getDb();

  console.info(`Seeding table ${table}...`);

  const createTable = await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "serial", (cb) => cb.primaryKey())
    .addColumn("federation_id", "varchar(255)")
    .addColumn("telegram_id", "varchar(255)")
    .addColumn("first_name", "varchar(255)", (cb) => cb.notNull())
    .addColumn("last_name", "varchar(255)")
    .addColumn("modified_at", sql`timestamp with time zone`, (cb) =>
      cb.defaultTo(sql`current_timestamp`),
    )
    .execute();

  return {
    createTable,
  };
}
