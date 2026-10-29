export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
export interface Pagination { page: number; limit: number; total: number; pages: number }
