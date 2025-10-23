import { db } from "./db";
import { portfolios, practices, payPeriods } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting database seed...");

  try {
    // Create 5 portfolios
    const portfolioIds = ["G1", "G2", "G3", "G4", "G5"];
    
    for (const id of portfolioIds) {
      const existing = await db.select().from(portfolios).where(eq(portfolios.id, id)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(portfolios).values({
          id,
          name: `Portfolio ${id}`,
        });
        console.log(`Created portfolio: ${id}`);
      } else {
        console.log(`Portfolio ${id} already exists`);
      }
    }

    // Create sample practices (12 per portfolio = 60 total)
    const practiceCount = 12;
    let totalCreated = 0;

    for (const portfolioId of portfolioIds) {
      for (let i = 1; i <= practiceCount; i++) {
        const practiceId = `${portfolioId}-P${String(i).padStart(2, "0")}`;
        const practiceName = `${portfolioId} Practice ${i}`;

        const existing = await db.select().from(practices).where(eq(practices.id, practiceId)).limit(1);
        
        if (existing.length === 0) {
          await db.insert(practices).values({
            id: practiceId,
            name: practiceName,
            portfolioId,
          });
          totalCreated++;
        }
      }
    }
    console.log(`Created ${totalCreated} new practices`);

    // Create pay periods for 2025 (26 periods)
    const baseDate = new Date("2025-01-01");
    
    for (let period = 1; period <= 26; period++) {
      const existing = await db.select().from(payPeriods).where(eq(payPeriods.id, period)).limit(1);
      
      if (existing.length === 0) {
        const startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() + (period - 1) * 14);
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 13);

        await db.insert(payPeriods).values({
          id: period,
          startDate,
          endDate,
          isCurrent: period === 1 ? 1 : 0,
          remeasurementCompleted: 0,
        });
        
        if (period === 1) {
          console.log(`Created pay period ${period} (CURRENT)`);
        }
      }
    }
    console.log("Pay periods created");

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

export { seed };

// Run seed
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
