import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Apex Cloud Functions entry point
export const healthCheck = onRequest((request, response) => {
  logger.info("Apex Health Check pinged", { structuredData: true });
  response.json({
    status: "ok",
    app: "Apex",
    timestamp: new Date().toISOString()
  });
});
