import { toast } from 'sonner';
import { ApiError } from '../api/client';

/**
 * mutation 失败时的统一提示。
 * 401 说明登录态已失效，`api/client.ts` 会清除凭据并触发跳转登录，
 * 这里不再弹出多余的 Toast。
 */
export function notifyMutationError(error: unknown, message: string) {
  if (error instanceof ApiError && error.status === 401) return;
  toast.error(message);
}
