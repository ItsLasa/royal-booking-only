import type { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { ApiError, fail } from "../lib/apiResponse";

export const validateBody = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return next(new ApiError(400, "VALIDATION_FAILED", "Please correct the highlighted fields.", Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]))));
  req.body = parsed.data;
  next();
};

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) return res.status(error.statusCode).json(fail(error));
  console.error(error);
  return res.status(500).json(fail(new ApiError(500, "INTERNAL_ERROR", process.env.NODE_ENV === "production" ? "An unexpected error occurred." : error instanceof Error ? error.message : "Unknown error")));
}
