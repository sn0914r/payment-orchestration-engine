import { app } from "./app";
import { configs } from "./configs";
import { logger } from "./utils/logger";
import { checkDbConnection } from "./clients/pgsql";
import { initReconciliationJob } from "./jobs/reconciliationJob";

const PORT = configs.PORT;

app.listen(PORT, async () => {
  logger.info(`Server is running at port: ${PORT}`);
  await checkDbConnection();
  initReconciliationJob();
});
