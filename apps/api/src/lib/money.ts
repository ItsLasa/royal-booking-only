import Decimal from "decimal.js";

export const money = (value: Decimal.Value) => new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
export const toNumber = (value: Decimal.Value) => money(value).toNumber();
export const formatLkr = (value: Decimal.Value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(toNumber(value));
