import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch API
global.fetch = vi.fn();

function createFetchResponse(data) {
  return { ok: true, json: () => Promise.resolve(data) };
}

describe('App', () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  it('renders the app title', async () => {
    fetch.mockResolvedValue(createFetchResponse([]));
    render(<App />);
    expect(screen.getByText('MyDaily')).toBeInTheDocument();
  });

  it('shows empty state when no entries', async () => {
    fetch.mockResolvedValue(createFetchResponse([]));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('No entries yet. Start writing!')).toBeInTheDocument();
    });
  });

  it('renders entries from API', async () => {
    const mockEntries = [
      { id: 1, title: 'Test Entry', content: 'Test content', created_at: '2024-01-01T12:00:00' }
    ];
    fetch.mockResolvedValue(createFetchResponse(mockEntries));
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Entry')).toBeInTheDocument();
    });
  });

  it('opens create form when clicking New Entry button', async () => {
    fetch.mockResolvedValue(createFetchResponse([]));
    render(<App />);
    
    const newButton = screen.getByText('New Entry');
    fireEvent.click(newButton);
    
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toBeInTheDocument();
  });

  it('submits new entry form', async () => {
    fetch.mockResolvedValueOnce(createFetchResponse([])); // Initial fetch
    fetch.mockResolvedValueOnce(createFetchResponse({ id: 1, title: 'New', content: 'Content' })); // Create
    fetch.mockResolvedValueOnce(createFetchResponse([{ id: 1, title: 'New', content: 'Content', created_at: '2024-01-01' }])); // Refetch
    
    render(<App />);
    
    fireEvent.click(screen.getByText('New Entry'));
    
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Content' } });
    fireEvent.click(screen.getByText('Save Entry'));
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });
});
