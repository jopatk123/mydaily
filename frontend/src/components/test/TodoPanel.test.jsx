import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TodoPanel from '../TodoPanel';

// Mock fetch 全局函数
global.fetch = vi.fn();

describe('TodoPanel', () => {
  const mockApiUrl = '';
  const mockTodos = [
    { id: 1, title: '完成测试', completed: false, created_at: '2026-02-03T10:00:00' },
    { id: 2, title: '写文档', completed: false, created_at: '2026-02-03T09:00:00' },
    { id: 3, title: '已完成的任务', completed: true, created_at: '2026-02-02T08:00:00' },
  ];

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    
    // 默认 fetch 返回成功
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockTodos,
    });

    // Mock window.confirm
    global.confirm = vi.fn(() => true);
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

  it('点击"添加新事项"应该显示输入框', async () => {
    render(<TodoPanel />);
    
    await waitFor(() => {
      const addButton = screen.getByText('添加新事项');
      fireEvent.click(addButton);
    });

    expect(screen.getByPlaceholderText('输入待办事项...')).toBeInTheDocument();
  });

  it('应该能通过点击确认按钮添加新待办', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTodos,
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 4, title: '新任务', completed: false }),
    });

    render(<TodoPanel />);
    
    await waitFor(() => {
      const addButton = screen.getByText('添加新事项');
      fireEvent.click(addButton);
    });

    const input = screen.getByPlaceholderText('输入待办事项...');
    fireEvent.change(input, { target: { value: '新任务' } });

    const confirmButton = screen.getByTitle('确认添加 (Enter)');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/todos/`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ title: '新任务', completed: false }),
        })
      );
    });
  });

  it('应该能通过按 Enter 键添加新待办', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTodos,
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 4, title: '新任务', completed: false }),
    });

    render(<TodoPanel />);
    
    await waitFor(() => {
      const addButton = screen.getByText('添加新事项');
      fireEvent.click(addButton);
    });

    const input = screen.getByPlaceholderText('输入待办事项...');
    fireEvent.change(input, { target: { value: '新任务' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/todos/`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('应该能通过按 Esc 键取消添加', async () => {
    render(<TodoPanel />);
    
    await waitFor(() => {
      const addButton = screen.getByText('添加新事项');
      fireEvent.click(addButton);
    });

    const input = screen.getByPlaceholderText('输入待办事项...');
    fireEvent.change(input, { target: { value: '测试内容' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('输入待办事项...')).not.toBeInTheDocument();
      expect(screen.getByText('添加新事项')).toBeInTheDocument();
    });
  });

  it('空内容时确认按钮应该被禁用', async () => {
    render(<TodoPanel />);
    
    await waitFor(() => {
      const addButton = screen.getByText('添加新事项');
      fireEvent.click(addButton);
    });

    const confirmButton = screen.getByTitle('确认添加 (Enter)');
    expect(confirmButton).toBeDisabled();
  });

  it('应该能切换待办完成状态', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTodos,
    }).mockResolvedValueOnce({
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
        })
      );
    });
  });

  it('应该能删除待办事项', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTodos,
    }).mockResolvedValueOnce({
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
        })
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
      expect(consoleError).toHaveBeenCalledWith(
        'Error fetching todos:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('未完成的待办应该排在已完成的前面', async () => {
    render(<TodoPanel />);
    
    await waitFor(() => {
      // 检查顺序：未完成的在前
      const texts = Array.from(document.querySelectorAll('.text-sm.truncate'))
        .map(el => el.textContent);
      
      const completedIndex = texts.indexOf('已完成的任务');
      const activeIndex1 = texts.indexOf('完成测试');
      const activeIndex2 = texts.indexOf('写文档');
      
      expect(activeIndex1).toBeLessThan(completedIndex);
      expect(activeIndex2).toBeLessThan(completedIndex);
    });
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
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...mockTodos[0], title: '修改后的标题' }) }); // PUT

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
        })
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
        expect.objectContaining({ method: 'DELETE' })
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
