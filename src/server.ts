import "dotenv/config";
import { app } from "./app";
import { configs } from "./configs";
import { logger } from "./utils/logger";

const PORT = configs.PORT;

app.listen(PORT, () => {
  logger.info(`Server is running at port: ${PORT}`);
});
