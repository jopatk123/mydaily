import { vi } from 'vitest';

// Mock fetch 全局函数（必须在模块加载时挂载，供每个测试文件共享）
global.fetch = vi.fn();

export const mockApiUrl = '';

export const mockTodos = [
  { id: 1, title: '完成测试', completed: false, created_at: '2026-02-03T10:00:00' },
  { id: 2, title: '写文档', completed: false, created_at: '2026-02-03T09:00:00' },
  { id: 3, title: '已完成的任务', completed: true, created_at: '2026-02-02T08:00:00' },
];

/** 构造一个最小可用的 fetch Response mock。 */
export function mockResponse(data) {
  return { ok: true, json: async () => data };
}

/** 重置 mock 并设置默认的 fetch 行为：返回 mockTodos。 */
export function setupDefaultFetch() {
  vi.clearAllMocks();
  global.fetch.mockResolvedValue(mockResponse(mockTodos));
  global.confirm = vi.fn(() => true);
}
