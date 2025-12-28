import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const API_URL = 'http://localhost:8000';

function App() {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${API_URL}/entries/`);
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/entries/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });
      if (response.ok) {
        setTitle('');
        setContent('');
        setIsCreating(false);
        fetchEntries();
      }
    } catch (error) {
      console.error('Error creating entry:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await fetch(`${API_URL}/entries/${id}`, {
        method: 'DELETE',
      });
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">MyDaily</h1>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            {isCreating ? 'Cancel' : <><Plus className="h-4 w-4 mr-2" /> New Entry</>}
          </button>
        </header>

        {isCreating && (
          <div className="bg-white shadow sm:rounded-lg mb-8 overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="What's on your mind?"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                  <textarea
                    id="content"
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="Write your thoughts..."
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {entries.map((entry) => (
            <article key={entry.id} className="bg-white shadow sm:rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{entry.title}</h3>
                  <div className="mt-1 max-w-2xl text-sm text-gray-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(new Date(entry.created_at), 'MMMM d, yyyy h:mm a')}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <div className="prose prose-indigo max-w-none text-gray-700 whitespace-pre-wrap">
                  {entry.content}
                </div>
              </div>
            </article>
          ))}
          {entries.length === 0 && !isCreating && (
            <div className="text-center py-12">
              <p className="text-gray-500">No entries yet. Start writing!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
