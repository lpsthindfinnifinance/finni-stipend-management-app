import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL, ensure the database is provisioned");
}

function encodeDatabaseUrl(url: string): string {
	const parsed = new URL(url);
	parsed.password = encodeURIComponent(decodeURIComponent(parsed.password));
	return parsed.toString();
}

export default defineConfig({
	out: "./migrations",
	schema: "./shared/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: encodeDatabaseUrl(process.env.DATABASE_URL),
		ssl: false,
	},
});
