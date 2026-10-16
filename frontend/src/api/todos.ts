import { del, get, post, put } from './client';
import type { Todo } from './types';

export function listTodos() {
  return get<Todo[]>('/todos/');
}

export function createTodo(title: string) {
  return post<Todo>('/todos/', { title, completed: false });
}

export function updateTodo(id: number, patch: { title?: string; completed?: boolean }) {
  return put<Todo>(`/todos/${id}`, patch);
}

export function deleteTodo(id: number) {
  return del<{ ok: boolean }>(`/todos/${id}`);
}
