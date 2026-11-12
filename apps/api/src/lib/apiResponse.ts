export class ApiError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public fieldErrors: Record<string, string> = {}) { super(message); }
}
export const ok = <T>(data: T) => ({ success: true, data });
export const fail = (error: ApiError) => ({ success: false, error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } });
