"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_SESSION_DAYS = exports.ADMIN_SESSION_COOKIE = void 0;
exports.createSessionToken = createSessionToken;
exports.hashSessionToken = hashSessionToken;
exports.publicAdminUser = publicAdminUser;
const crypto_1 = __importDefault(require("crypto"));
exports.ADMIN_SESSION_COOKIE = "rmv_admin_session";
exports.ADMIN_SESSION_DAYS = 7;
function createSessionToken() {
    return crypto_1.default.randomBytes(32).toString("base64url");
}
function hashSessionToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
function publicAdminUser(user) {
    return { id: user.id, name: user.name, email: user.email, role: user.role };
}
