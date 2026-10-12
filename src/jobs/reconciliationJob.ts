import cron from "node-cron";
import { ReconciliationService } from "@/modules/reconciliation/reconciliation.service";
import { PAYMENT } from "@/constants";
import { logger } from "@/utils/logger";

const getYesterdayDateString = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};

export const initReconciliationJob = () => {
  // Runs daily at 2:00 AM (server local time)
  cron.schedule("0 2 * * *", async () => {
    const yesterday = getYesterdayDateString();
    logger.info({ date: yesterday }, "Starting nightly automated reconciliation job");

    try {
      await ReconciliationService.run({
        date: yesterday,
        gateway: PAYMENT.GATEWAYS.RAZORPAY,
      });

      await ReconciliationService.run({
        date: yesterday,
        gateway: PAYMENT.GATEWAYS.CASHFREE,
      });

      logger.info({ date: yesterday }, "Nightly reconciliation job completed successfully");
    } catch (error) {
      logger.error({ err: error, date: yesterday }, "Error during nightly reconciliation cron job");
    }
  });

  logger.info("Nightly reconciliation cron scheduled for 02:00 AM");
};
