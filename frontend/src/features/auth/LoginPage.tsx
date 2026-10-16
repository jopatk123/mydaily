import { Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ApiError, post } from '../../api/client';
import { getStoredAuth, storeAuth } from '../../api/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (getStoredAuth()) return <Navigate to="/" replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { token } = await post<{ token: string }>('/auth/login', { password });
      storeAuth(token);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.message ? caught.message : '密码不正确，请重试。',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md rounded-2xl border border-rule bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-accent p-2 text-accent-ink">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl">MyDaily</h1>
            <p className="text-sm text-muted">请输入密码继续</p>
          </div>
        </div>
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              placeholder="请输入访问密码"
              className="w-full rounded-xl border border-rule bg-paper p-3 text-sm outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            进入
          </button>
        </form>
      </div>
    </div>
  );
}
