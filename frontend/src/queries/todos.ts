import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { createTodo, deleteTodo, listTodos, updateTodo } from '../api/todos';
import type { Todo } from '../api/types';
import { todoKeys } from './keys';

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export function useTodos() {
  return useQuery({
    queryKey: todoKeys.all,
    queryFn: async () => {
      const data = await listTodos();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useAddTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => client.invalidateQueries({ queryKey: todoKeys.all }),
    onError: (error) => {
      if (!isUnauthorized(error)) toast.error('添加待办失败，请稍后重试。');
    },
  });
}

export function useUpdateTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: { title?: string; completed?: boolean } }) =>
      updateTodo(id, patch),
    onMutate: async ({ id, patch }) => {
      await client.cancelQueries({ queryKey: todoKeys.all });
      const previous = client.getQueryData<Todo[]>(todoKeys.all);
      if (previous) {
        client.setQueryData(
          todoKeys.all,
          previous.map((todo) => (todo.id === id ? { ...todo, ...patch } : todo)),
        );
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) client.setQueryData(todoKeys.all, context.previous);
      if (!isUnauthorized(error)) toast.error('更新待办失败，请稍后重试。');
    },
    onSettled: () => client.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

export function useDeleteTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteTodo,
    onMutate: async (id: number) => {
      await client.cancelQueries({ queryKey: todoKeys.all });
      const previous = client.getQueryData<Todo[]>(todoKeys.all);
      if (previous)
        client.setQueryData(
          todoKeys.all,
          previous.filter((todo) => todo.id !== id),
        );
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) client.setQueryData(todoKeys.all, context.previous);
      if (!isUnauthorized(error)) toast.error('删除待办失败，请稍后重试。');
    },
    onSettled: () => client.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

export function useClearCompletedTodos() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (todos: Todo[]) => {
      const results = await Promise.allSettled(todos.map((todo) => deleteTodo(todo.id)));
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed > 0) throw new Error(`failed:${failed}`);
    },
    onMutate: async () => {
      await client.cancelQueries({ queryKey: todoKeys.all });
      const previous = client.getQueryData<Todo[]>(todoKeys.all);
      if (previous)
        client.setQueryData(
          todoKeys.all,
          previous.filter((todo) => !todo.completed),
        );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) client.setQueryData(todoKeys.all, context.previous);
      if (!isUnauthorized(error)) toast.error('清除失败，请稍后重试。');
    },
    onSettled: () => client.invalidateQueries({ queryKey: todoKeys.all }),
  });
}
