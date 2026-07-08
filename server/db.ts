import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

function encodeDatabaseUrl(url: string): string {
	const parsed = new URL(url);
	parsed.password = encodeURIComponent(parsed.password);
	return parsed.toString();
}

export const pool = new Pool({
	connectionString: process.env.POSTGRES_CONNECTION_STRING,
	ssl: { rejectUnauthorized: false },
});
export const db = drizzle({ client: pool, schema });
