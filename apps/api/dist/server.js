"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const app_1 = require("./app");
const env_1 = require("./config/env");
exports.app = (0, app_1.createApp)();
if (process.env.NODE_ENV !== "test") {
    exports.app.listen(env_1.env.PORT, () => {
        console.log(`Villa booking API listening on port/socket: ${env_1.env.PORT}`);
    });
}
exports.default = exports.app;
