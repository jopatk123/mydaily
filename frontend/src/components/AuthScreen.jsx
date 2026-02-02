import { Lock } from 'lucide-react';

function AuthScreen({ passwordInput, setPasswordInput, authError, handleAuthSubmit }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-600 p-2 rounded-lg shadow">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">MyDaily</h1>
            <p className="text-sm text-gray-500">请输入密码继续</p>
          </div>
        </div>
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">密码</label>
            <input
              id="password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border transition-colors"
              placeholder="请输入访问密码"
              required
            />
          </div>
          {authError && (
            <p className="text-sm text-red-500 font-medium">{authError}</p>
          )}
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-full shadow-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            进入
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthScreen;
