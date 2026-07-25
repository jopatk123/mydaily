import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TodoPanel from '../TodoPanel';
import { mockApiUrl, setupDefaultFetch } from './todo-panel-test-utils';

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
      expect(global.fetch).toHaveBeenCalledWith(`${mockApiUrl}/todos/`, expect.any(Object));
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
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText(/还没有待办事项/)).toBeInTheDocument();
      expect(screen.getByText(/添加一个吧/)).toBeInTheDocument();
    });
  });

  it('API 错误时应该优雅处理', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch.mockRejectedValue(new Error('Network error'));

    render(<TodoPanel />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Error fetching todos:', expect.any(Error));
    });

    consoleError.mockRestore();
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
