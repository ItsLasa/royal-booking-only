"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = void 0;
exports.errorHandler = errorHandler;
const apiResponse_1 = require("../lib/apiResponse");
const validateBody = (schema) => (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return next(new apiResponse_1.ApiError(400, "VALIDATION_FAILED", "Please correct the highlighted fields.", Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]))));
    req.body = parsed.data;
    next();
};
exports.validateBody = validateBody;
function errorHandler(error, _req, res, _next) {
    if (error instanceof apiResponse_1.ApiError)
        return res.status(error.statusCode).json((0, apiResponse_1.fail)(error));
    console.error(error);
    return res.status(500).json((0, apiResponse_1.fail)(new apiResponse_1.ApiError(500, "INTERNAL_ERROR", process.env.NODE_ENV === "production" ? "An unexpected error occurred." : error instanceof Error ? error.message : "Unknown error")));
}
