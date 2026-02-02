import { Plus } from 'lucide-react';

function MobileFab({ onCreate }) {
  return (
    <button
      onClick={onCreate}
      className="lg:hidden fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all z-50 active:scale-95"
      aria-label="新建日记"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}

export default MobileFab;
