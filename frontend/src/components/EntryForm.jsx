import { PenTool } from 'lucide-react';

function EntryForm({ isEditing, title, setTitle, content, setContent, handleSubmit }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-10 overflow-hidden transform transition-all duration-300">
      <div className="p-6 sm:p-10">
        <div className="flex items-center space-x-2 mb-8">
          <PenTool className="h-6 w-6 text-indigo-500" />
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditing ? '编辑日记' : '记下此刻的想法'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
              标题
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg p-4 border transition-colors"
              placeholder="今天想写点什么？"
              required
            />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
              内容
            </label>
            <textarea
              id="content"
              rows={15}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base p-4 border transition-colors resize-none leading-relaxed"
              placeholder="在此记录下今天的点滴..."
              required
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-semibold rounded-full shadow-md text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              {isEditing ? '保存修改' : '发布日记'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EntryForm;
