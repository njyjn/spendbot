// Polyfill Buffer for server-side code that needs it
if (typeof globalThis.Buffer === "undefined") {
  // @ts-ignore
  globalThis.Buffer = require("buffer").Buffer;
}

import { seedDb } from "./lib/kysely";

export async function register() {
  await seedDb("users");
}
