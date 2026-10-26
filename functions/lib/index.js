"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
// Apex Cloud Functions entry point
exports.healthCheck = (0, https_1.onRequest)((request, response) => {
    logger.info("Apex Health Check pinged", { structuredData: true });
    response.json({
        status: "ok",
        app: "Apex",
        timestamp: new Date().toISOString()
    });
});
//# sourceMappingURL=index.js.map