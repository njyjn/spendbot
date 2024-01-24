import { seedDb } from "./lib/kysely";

export async function register() {
  await seedDb("users");
}
