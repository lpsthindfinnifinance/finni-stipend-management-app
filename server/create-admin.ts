import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

async function createAdminUser() {
	console.log("Creating admin user...");

	try {
		const adminEmail = "jacob.trauner@finnihealth.com";
		const existingAdmin = await db
			.select()
			.from(users)
			.where(eq(users.email, adminEmail))
			.limit(1);

		if (existingAdmin.length === 0) {
			await db.insert(users).values({
				email: adminEmail,
				firstName: "Jacob",
				lastName: "Trauner",
				role: "Admin",
				roles: ["Admin"],
				isActive: true,
			});
			console.log(`✅ Created admin user: ${adminEmail}`);
		} else {
			console.log(`ℹ️  Admin user ${adminEmail} already exists`);
		}
	} catch (error) {
		console.error("❌ Error creating admin user:", error);
		throw error;
	}
}

export { createAdminUser };

// Run script
createAdminUser()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});