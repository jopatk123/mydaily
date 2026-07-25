import { Book, Download, Plus, X } from 'lucide-react';

function HeaderBar({ isCreating, isEditing, onToggleCreate, onExportAll, isExporting }) {
  return (
    <header className="flex justify-between items-center mb-8 border-b border-gray-200 pb-6">
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
          <Book className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">MyDaily</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">写下你的每一天</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!isCreating && (
          <button
            onClick={onExportAll}
            disabled={isExporting}
            className="hidden lg:inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 disabled:opacity-60"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? '导出中...' : '导出所有日记'}
          </button>
        )}
        <button
          onClick={onToggleCreate}
          className={`inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isCreating
              ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500'
              : 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
          }`}
        >
          {isCreating ? (
            <>
              <X className="h-4 w-4 mr-2" /> {isEditing ? '取消编辑' : '取消'}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> 新建日记
            </>
          )}
        </button>
      </div>
    </header>
  );
}

export default HeaderBar;
