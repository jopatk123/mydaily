import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TodoPanel from '../TodoPanel';
import { mockApiUrl, mockTodos, setupDefaultFetch } from './todo-panel-test-utils';

describe('TodoPanel — 切换/删除/编辑', () => {
  beforeEach(() => {
    setupDefaultFetch();
  });

  it('应该能切换待办完成状态', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodos,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockTodos[0], completed: true }),
      });

    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('完成测试')).toBeInTheDocument();
    });

    const todoItem = screen.getByText('完成测试').closest('div');
    const toggleButton = todoItem.querySelector('button');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/todos/1`,
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"completed":true'),
        }),
      );
    });
  });

  it('应该能删除待办事项', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodos,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('完成测试')).toBeInTheDocument();
    });

    const todoItem = screen.getByText('完成测试').closest('div');
    const deleteButtons = todoItem.querySelectorAll('button');
    const deleteButton = deleteButtons[deleteButtons.length - 1]; // 最后一个按钮是删除按钮

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('确定要删除 "完成测试" 吗？');
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/todos/1`,
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });

  it('取消删除时不应该调用 API', async () => {
    global.confirm = vi.fn(() => false); // 用户点击取消

    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('完成测试')).toBeInTheDocument();
    });

    const todoItem = screen.getByText('完成测试').closest('div');
    const deleteButtons = todoItem.querySelectorAll('button');
    const deleteButton = deleteButtons[deleteButtons.length - 1];

    const fetchCallsBefore = global.fetch.mock.calls.length;
    fireEvent.click(deleteButton);

    // 确认 fetch 没有被再次调用
    expect(global.fetch.mock.calls.length).toBe(fetchCallsBefore);
  });

  it('点击编辑按钮应该显示内联编辑输入框', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('完成测试')).toBeInTheDocument();
    });

    const todoItem = screen.getByText('完成测试').closest('div');
    const editButton = todoItem.querySelector('button[title="编辑"]');
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton);

    await waitFor(() => {
      const input = screen.getByDisplayValue('完成测试');
      expect(input).toBeInTheDocument();
    });
  });

  it('双击标题应该进入编辑模式', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('完成测试')).toBeInTheDocument();
    });

    const titleSpan = screen.getByText('完成测试');
    fireEvent.dblClick(titleSpan);

    await waitFor(() => {
      expect(screen.getByDisplayValue('完成测试')).toBeInTheDocument();
    });
  });

  it('编辑后按 Enter 应该保存修改', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockTodos }) // fetchTodos
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockTodos[0], title: '修改后的标题' }),
      }); // PUT

    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('完成测试')).toBeInTheDocument();
    });

    const titleSpan = screen.getByText('完成测试');
    fireEvent.dblClick(titleSpan);

    const editInput = await screen.findByDisplayValue('完成测试');
    fireEvent.change(editInput, { target: { value: '修改后的标题' } });
    fireEvent.submit(editInput.closest('form'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/todos/1`,
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"title":"修改后的标题"'),
        }),
      );
    });
  });

  it('编辑后按 Esc 应该取消编辑', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('完成测试')).toBeInTheDocument();
    });

    const titleSpan = screen.getByText('完成测试');
    fireEvent.dblClick(titleSpan);

    const editInput = await screen.findByDisplayValue('完成测试');
    fireEvent.change(editInput, { target: { value: '不保存的内容' } });
    fireEvent.keyDown(editInput, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByDisplayValue('不保存的内容')).not.toBeInTheDocument();
      expect(screen.getByText('完成测试')).toBeInTheDocument();
    });
  });

  it('内容不变时保存不应该调用 API', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('完成测试')).toBeInTheDocument();
    });

    const titleSpan = screen.getByText('完成测试');
    fireEvent.dblClick(titleSpan);

    const editInput = await screen.findByDisplayValue('完成测试');
    const fetchCallsBefore = global.fetch.mock.calls.length;
    fireEvent.submit(editInput.closest('form'));

    expect(global.fetch.mock.calls.length).toBe(fetchCallsBefore);
  });

  it('已完成的待办不应该显示编辑按钮', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('已完成的任务')).toBeInTheDocument();
    });

    const completedItem = screen.getByText('已完成的任务').closest('div');
    const editButton = completedItem.querySelector('button[title="编辑"]');
    expect(editButton).toBeNull();
  });
});

describe('TodoPanel — 批量清除已完成', () => {
  beforeEach(() => {
    setupDefaultFetch();
  });

  it('有已完成待办时应该显示"清除已完成"按钮', async () => {
    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('清除已完成')).toBeInTheDocument();
    });
  });

  it('没有已完成待办时不应显示"清除已完成"按钮', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, title: '未完成1', completed: false, created_at: '2026-02-03T10:00:00' },
      ],
    });

    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('未完成1')).toBeInTheDocument();
    });

    expect(screen.queryByText('清除已完成')).not.toBeInTheDocument();
  });

  it('点击"清除已完成"应该删除所有已完成的待办', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockTodos }) // fetchTodos
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }); // DELETE * N

    global.confirm = vi.fn(() => true);

    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('清除已完成')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('清除已完成'));

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('确定要清除 1 个已完成的待办吗？');
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/todos/3`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('取消清除时不应该调用删除 API', async () => {
    global.confirm = vi.fn(() => false);

    render(<TodoPanel />);

    await waitFor(() => {
      expect(screen.getByText('清除已完成')).toBeInTheDocument();
    });

    const fetchCallsBefore = global.fetch.mock.calls.length;
    fireEvent.click(screen.getByText('清除已完成'));

    expect(global.fetch.mock.calls.length).toBe(fetchCallsBefore);
  });
});
