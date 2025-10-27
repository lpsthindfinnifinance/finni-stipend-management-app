import { db } from './db';
import { practices, practiceMetrics, portfolios } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function importBigQueryData() {
  console.log('Starting BigQuery data import...');
  
  // Read the CSV file
  const csvPath = path.join(process.cwd(), 'attached_assets', 'bquxjob_33501350_19a27957776_1761600758852.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  console.log(`Found ${lines.length - 1} data rows`);
  
  // First, clear existing practices and metrics
  console.log('Clearing existing practices and metrics...');
  await db.delete(practiceMetrics);
  await db.delete(practices);
  
  let importedPractices = 0;
  let importedMetrics = 0;
  
  // Process each data row
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    
    const clinicName = row.clinicName;
    const displayName = row.Display_Name;
    const group = row.Group; // G1, G2, G3, G4, G5
    
    if (!clinicName || !group) continue;
    
    // Insert or update practice
    const existingPractice = await db.select().from(practices).where(eq(practices.id, clinicName)).limit(1);
    
    if (existingPractice.length === 0) {
      await db.insert(practices).values({
        id: clinicName,
        name: displayName || clinicName,
        portfolioId: group,
      });
      importedPractices++;
    }
    
    // Parse numeric values
    const parseDecimal = (val: string) => {
      if (!val || val === '') return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num.toString();
    };
    
    const parseInt = (val: string) => {
      if (!val || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };
    
    // Import metrics
    const metricsData: any = {
      clinicName: clinicName,
      displayName: displayName,
      group: group,
      practiceDisplayNameGroup: row.Practice_DisplayName_Group,
      isActivePractice: row.IsActivePractice === 'true' ? 1 : 0,
      currentPayPeriodNumber: parseInt(row.currentPayPeriod_Number) || 21,
      
      // YTD metrics
      billedPpsYtd: parseInt(row.billedPPs_YTD),
      netRevenueSubTotalYtd: parseDecimal(row.netRevenueSubTotal_YTD),
      rentLeaseStipendYtd: parseDecimal(row.rentLeaseStipend_YTD),
      staffTrainingCostYtd: parseDecimal(row.staffTrainingCost_YTD),
      totalStaffCostYtd: parseDecimal(row.totalStaffCost_YTD),
      miscellaneousYtd: parseDecimal(row.miscellaneous_YTD),
      hqErrorsStipendYtd: parseDecimal(row.hqErrorsStipend_YTD),
      poErrorsStipendYtd: parseDecimal(row.poErrorsStipend_YTD),
      negativeEarningsYtd: parseDecimal(row.negativeEarnings_YTD),
      brexExpensesReimbursementMktYtd: parseDecimal(row.brexExpensesReimbursementMkt_YTD),
      coveredBenefitsYtd: parseDecimal(row.coveredBenefits_YTD),
      salesMarketingSubTotalYtd: parseDecimal(row.salesMarketing_SubTotal_YTD),
      grossMarginSubTotalYtd: parseDecimal(row.grossMargin_subTotal_YTD),
      totalPromotionalSpendYtd: parseDecimal(row.totalPromotionalSpend_YTD),
      grossMarginBeforePromSpendYtd: parseDecimal(row.grossMarginBeforePromSpend_YTD),
      promotionalSpendExclHqErrNegErnsYtd: parseDecimal(row.promotionalSpendExclHQErrNegErns_YTD),
      
      // L6PP metrics
      billedPpsL6pp: parseInt(row.billedPPs_L6PP),
      netRevenueSubTotalL6pp: parseDecimal(row.netRevenueSubTotal_L6PP),
      grossMarginSubTotalL6pp: parseDecimal(row.grossMargin_subTotal_L6PP),
      totalPromotionalSpendL6pp: parseDecimal(row.totalPromotionalSpend_L6PP),
      grossMarginBeforePromSpendL6pp: parseDecimal(row.grossMarginBeforePromSpend_L6PP),
      promotionalSpendExclHqErrNegErnsL6pp: parseDecimal(row.promotionalSpendExclHQErrNegErns_L6PP),
      
      // 2PP Lag metrics
      chargeDollars2ppLag: parseDecimal(row.chargeDollars_2PP_Lag),
      arboraCollections2ppLag: parseDecimal(row.arboraCollections_2PP_Lag),
      
      // Percentages
      grossMarginBeforeStipendPercentYtd: parseDecimal(row.grossMarginBeforeStipend_Percent_YTD),
      grossMarginBeforeStipendPercentL6pp: parseDecimal(row.grossMarginBeforeStipend_Percent_L6PP),
      collectionsPercent2ppLag: parseDecimal(row.collectionsPercent_2PP_Lag),
      
      // Revenue projections
      netRevenueFy: parseDecimal(row.netRevenue_FY),
      netRevenueAnnualizedL6pp: parseDecimal(row.netRevenue_Annualized_L6PP),
      
      // Performance metrics
      performanceMetricYtd: parseDecimal(row.performanceMetric_YTD),
      performanceMetricL6pp: parseDecimal(row.performanceMetric_L6PP),
      
      // Stipend caps
      stipendCapRateFy: parseDecimal(row.stipendCapRate_FY),
      stipendCapRateAnnual: parseDecimal(row.stipendCapRate_Annual),
      stipendCapFy: parseDecimal(row.stipendCap_FY),
      stipendCapAnnualizedAdj: parseDecimal(row.stipendCap_Annualized_Adj),
      stipendCapAvgFinal: parseDecimal(row.stipendCap_Avg_Final),
      
      // Negative earnings cap - note capital N in CSV column name
      negativeEarningsCap: parseDecimal(row.NegativeEarningsCap),
    };
    
    await db.insert(practiceMetrics).values(metricsData);
    importedMetrics++;
  }
  
  console.log(`✅ Import complete!`);
  console.log(`   - ${importedPractices} practices imported`);
  console.log(`   - ${importedMetrics} metrics records imported`);
}

importBigQueryData()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
