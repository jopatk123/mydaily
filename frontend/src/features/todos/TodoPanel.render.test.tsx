import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import TodoPanel from './TodoPanel';
import { renderWithProviders as render } from '../../test/render';
import { fetchMock, mockApiUrl, setupDefaultFetch } from './todo-panel-test-utils';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

describe('TodoPanel — 渲染与初始加载', () => {
  beforeEach(() => {
    setupDefaultFetch();
  });

  it('应该正确渲染待办事项面板', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('待办事项')).toBeInTheDocument();
    });
  });

  it('应该在初始化时获取待办列表', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}/todos/`, expect.any(Object));
    });
  });

  it('应该显示待办数量统计', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      // 2 个未完成的待办
      expect(screen.getByText('2 待办')).toBeInTheDocument();
    });
  });

  it('应该渲染所有待办事项', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('完成测试')).toBeInTheDocument();
      expect(screen.getByText('写文档')).toBeInTheDocument();
      expect(screen.getByText('已完成的任务')).toBeInTheDocument();
    });
  });

  it('没有待办时应该显示提示信息', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText(/还没有待办事项/)).toBeInTheDocument();
      expect(screen.getByText(/添加一个吧/)).toBeInTheDocument();
    });
  });

  it('加载待办失败时应该提示错误', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    render(<TodoPanel />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('待办加载失败，请稍后重试。');
    });
  });

  it('加载待办返回 401 时不应该弹出错误提示', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Token expired' }),
    });

    render(<TodoPanel />);

    // 等错误真正落到 UI（空列表提示）后再断言，避免断言早于请求 settle
    await waitFor(() => {
      expect(screen.getByText(/还没有待办事项/)).toBeInTheDocument();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('未完成的待办应该排在已完成的前面', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      const texts = Array.from(document.querySelectorAll('.text-sm.truncate')).map(
        (el) => el.textContent,
      );

      const completedIndex = texts.indexOf('已完成的任务');
      const activeIndex1 = texts.indexOf('完成测试');
      const activeIndex2 = texts.indexOf('写文档');

      expect(activeIndex1).toBeLessThan(completedIndex);
      expect(activeIndex2).toBeLessThan(completedIndex);
    });
  });
});
