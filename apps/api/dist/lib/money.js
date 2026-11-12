"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLkr = exports.toNumber = exports.money = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
const money = (value) => new decimal_js_1.default(value).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
exports.money = money;
const toNumber = (value) => (0, exports.money)(value).toNumber();
exports.toNumber = toNumber;
const formatLkr = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format((0, exports.toNumber)(value));
exports.formatLkr = formatLkr;
