"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fail = exports.ok = exports.ApiError = void 0;
class ApiError extends Error {
    statusCode;
    code;
    fieldErrors;
    constructor(statusCode, code, message, fieldErrors = {}) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.fieldErrors = fieldErrors;
    }
}
exports.ApiError = ApiError;
const ok = (data) => ({ success: true, data });
exports.ok = ok;
const fail = (error) => ({ success: false, error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } });
exports.fail = fail;
