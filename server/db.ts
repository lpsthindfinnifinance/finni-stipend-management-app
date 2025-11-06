import { neonConfig, Pool } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
	throw new Error(
		"DATABASE_URL must be set. Did you forget to provision a database?",
	);
}

function encodeDatabaseUrl(url: string): string {
	const parsed = new URL(url);
	parsed.password = encodeURIComponent(parsed.password);
	return parsed.toString();
}

export const pool = new Pool({
	connectionString: encodeDatabaseUrl(process.env.DATABASE_URL),
	ssl: false,
});
export const db = drizzle({ client: pool, schema });
