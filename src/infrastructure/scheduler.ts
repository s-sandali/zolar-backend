import cron from 'node-cron';
import { syncEnergyGenerationRecords } from '../application/background/sync-energy-generation-records';
import { generateMonthlyInvoices } from '../application/background/generate-invoices';

export const initializeScheduler = () => {
  // Run daily at 00:00 (midnight) - cron expression: '0 0 * * *'
  const syncSchedule = process.env.SYNC_CRON_SCHEDULE || '0 0 * * *';

  cron.schedule(syncSchedule, async () => {
    console.log(`[${new Date().toISOString()}] Starting daily energy generation records sync...`);
    try {
      await syncEnergyGenerationRecords();
      console.log(`[${new Date().toISOString()}] Daily sync completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Daily sync failed:`, error);
    }
  });

  console.log(`[Scheduler] Energy generation records sync scheduled for: ${syncSchedule}`);

  // Run daily at 01:00 (1 AM) to check for invoice generation - cron expression: '0 1 * * *'
  const invoiceSchedule = process.env.INVOICE_CRON_SCHEDULE || '0 1 * * *';

  cron.schedule(invoiceSchedule, async () => {
    console.log(`[${new Date().toISOString()}] Starting monthly invoice generation check...`);
    try {
      await generateMonthlyInvoices();
      console.log(`[${new Date().toISOString()}] Invoice generation check completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Invoice generation failed:`, error);
    }
  });

  console.log(`[Scheduler] Invoice generation scheduled for: ${invoiceSchedule}`);
};
