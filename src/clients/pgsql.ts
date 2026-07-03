import { Pool } from "pg";
import { configs } from "../configs";
import { drizzle } from "drizzle-orm/singlestore";

const isLocal = configs.DATABASE_URL?.includes("localhost");

const pool = new Pool({
  connectionString: configs.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool);
