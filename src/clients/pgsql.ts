import { Pool } from "pg";
import { configs } from "../configs";
import { drizzle } from "drizzle-orm/node-postgres";
import { logger } from "../utils/logger";

const pool = new Pool({
  connectionString: configs.DATABASE_URL,
  ssl: configs.NODE_ENV === "production" ? true : false,
});

export const db = drizzle(pool);

export const checkDbConnection = async () => {
  try {
    const client = await pool.connect();
    logger.info("Database connection successful");
    client.release();
  } catch (error) {
    logger.error("Database connection failed:");
    logger.error(error);
  }
};
