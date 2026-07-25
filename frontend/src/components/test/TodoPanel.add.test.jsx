import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TodoPanel from '../TodoPanel';
import { mockApiUrl, mockTodos, setupDefaultFetch } from './todo-panel-test-utils';

describe('TodoPanel — 添加待办', () => {
  beforeEach(() => {
    setupDefaultFetch();
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
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodos,
      })
      .mockResolvedValueOnce({
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
        }),
      );
    });
  });

  it('应该能通过按 Enter 键添加新待办', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodos,
      })
      .mockResolvedValueOnce({
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
        }),
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
});
