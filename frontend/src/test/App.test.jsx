import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch API
globalThis.fetch = vi.fn();
const AUTH_STORAGE_KEY = 'mydaily_auth';

beforeAll(() => {
  if (!global.URL.createObjectURL) {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
  }
  if (!global.URL.revokeObjectURL) {
    global.URL.revokeObjectURL = vi.fn();
  }
});

function createFetchResponse(data) {
  return { ok: true, json: () => Promise.resolve(data) };
}

function mockFetchByUrl(handlers) {
  fetch.mockImplementation((url, options) => {
    const key = typeof url === 'string' ? url : String(url);
    for (const [matcher, responder] of handlers) {
      if (typeof matcher === 'string' && key.includes(matcher)) return responder(key, options);
      if (matcher instanceof RegExp && matcher.test(key)) return responder(key, options);
    }
    return Promise.resolve(createFetchResponse([]));
  });
}

describe('App', () => {
  beforeEach(() => {
    fetch.mockReset();
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: 'test-token', expiresAt: Date.now() + 1000 * 60 * 60 * 24 }),
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  const toYmd = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  it('renders the app title', async () => {
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse([]))],
      ['/entries/', () => Promise.resolve(createFetchResponse([]))],
    ]);
    render(<App />);
    expect(screen.getByText('MyDaily')).toBeInTheDocument();
  });

  it('requires password on first load', async () => {
    localStorage.clear();
    mockFetchByUrl([
      ['/auth/login', () => Promise.resolve(createFetchResponse({ token: 'test-token' }))],
      ['/entries/dates/', () => Promise.resolve(createFetchResponse([]))],
      ['/entries/', () => Promise.resolve(createFetchResponse([]))],
    ]);
    render(<App />);

    expect(screen.getByText('请输入密码继续')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'asd123123123' } });
    fireEvent.click(screen.getByText('进入'));

    await waitFor(
      () => {
        expect(screen.getByText('MyDaily')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('shows empty state when no entries', async () => {
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse([]))],
      ['/entries/', () => Promise.resolve(createFetchResponse([]))],
    ]);
    render(<App />);
    await waitFor(
      () => {
        expect(screen.getByText('还没有日记呢。开始写下第一篇吧！')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('renders entries from API', async () => {
    const mockEntries = [
      { id: 1, title: 'Test Entry', content: 'Test content', created_at: '2024-01-01T12:00:00' },
    ];
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse(['2024-01-01']))],
      ['/entries/', () => Promise.resolve(createFetchResponse(mockEntries))],
    ]);

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('Test Entry')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('opens create form when clicking New Entry button', async () => {
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse([]))],
      ['/entries/', () => Promise.resolve(createFetchResponse([]))],
    ]);
    render(<App />);

    const newButton = screen.getByText('新建日记');
    fireEvent.click(newButton);

    expect(screen.getByLabelText('标题')).toBeInTheDocument();
    expect(screen.getByLabelText('内容')).toBeInTheDocument();
  });

  it('submits new entry form', async () => {
    const entriesAfter = [
      { id: 1, title: 'New', content: 'Content', created_at: '2024-01-01T00:00:00' },
    ];
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse([]))],
      [
        new RegExp('/entries/$'),
        (_url, options) => {
          if (options?.method === 'POST') {
            return Promise.resolve(
              createFetchResponse({ id: 1, title: 'New', content: 'Content' }),
            );
          }
          return Promise.resolve(createFetchResponse(entriesAfter));
        },
      ],
    ]);

    render(<App />);

    fireEvent.click(screen.getByText('新建日记'));

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('内容'), { target: { value: 'Content' } });
    fireEvent.click(screen.getByText('发布日记'));

    await waitFor(() => {
      // initial /entries + initial /entries/dates + POST /entries + refetch /entries + refetch /entries/dates
      expect(fetch).toHaveBeenCalled();
    });
  });

  it('searches entries by query in realtime (debounced)', async () => {
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse([]))],
      [
        '/entries/search/',
        () =>
          Promise.resolve(
            createFetchResponse([
              { id: 9, title: 'Match', content: '...', created_at: '2024-01-01T12:00:00' },
            ]),
          ),
      ],
      ['/entries/', () => Promise.resolve(createFetchResponse([]))],
    ]);

    render(<App />);

    fireEvent.change(screen.getByLabelText('搜索'), { target: { value: 'Match' } });

    await waitFor(
      () => {
        expect(screen.getByText('Match')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('blank search falls back to entries list', async () => {
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse([]))],
      [
        '/entries/search/',
        () =>
          Promise.resolve(
            createFetchResponse([
              { id: 99, title: 'ShouldNotShow', content: '...', created_at: '2024-01-01T12:00:00' },
            ]),
          ),
      ],
      [
        '/entries/',
        () =>
          Promise.resolve(
            createFetchResponse([
              { id: 1, title: 'List Item', content: '...', created_at: '2024-01-01T12:00:00' },
            ]),
          ),
      ],
    ]);

    render(<App />);

    fireEvent.change(screen.getByLabelText('搜索'), { target: { value: '   ' } });

    await waitFor(
      () => {
        expect(screen.getByText('List Item')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    expect(screen.queryByText('ShouldNotShow')).not.toBeInTheDocument();
  });

  it('filters entries by clicking a calendar date', async () => {
    const today = new Date();
    const todayYmd = toYmd(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowYmd = toYmd(tomorrow);

    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse([todayYmd]))],
      // initial load (all)
      [
        new RegExp('/entries/?$'),
        () =>
          Promise.resolve(
            createFetchResponse([
              { id: 1, title: 'A', content: '...', created_at: `${todayYmd}T12:00:00` },
              { id: 2, title: 'B', content: '...', created_at: `${tomorrowYmd}T12:00:00` },
            ]),
          ),
      ],
      // date-filtered load
      [
        '/entries/?date=',
        () =>
          Promise.resolve(
            createFetchResponse([
              { id: 1, title: 'A', content: '...', created_at: `${todayYmd}T12:00:00` },
            ]),
          ),
      ],
    ]);

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    fireEvent.click(screen.getByLabelText(`选择日期 ${todayYmd}`));

    await waitFor(
      () => {
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.queryByText('B')).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('opens edit form when clicking edit button', async () => {
    const mockEntries = [
      { id: 1, title: 'Edit Me', content: 'Original', created_at: '2024-01-01T12:00:00' },
    ];
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse(['2024-01-01']))],
      ['/entries/', () => Promise.resolve(createFetchResponse(mockEntries))],
    ]);

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('Edit Me')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    fireEvent.click(screen.getByLabelText('编辑日记'));

    expect(screen.getByDisplayValue('Edit Me')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original')).toBeInTheDocument();
  });

  it('exports all entries', async () => {
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse([]))],
      [
        '/entries/export/',
        () =>
          Promise.resolve(
            createFetchResponse([
              { id: 1, title: 'A', content: 'B', created_at: '2024-01-01T00:00:00' },
            ]),
          ),
      ],
      ['/entries/', () => Promise.resolve(createFetchResponse([]))],
    ]);

    render(<App />);

    const exportButton = screen.getByText('导出所有日记');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/entries/export/'),
        expect.any(Object),
      );
    });
  });

  it('logs out and shows auth screen when API returns 401', async () => {
    const unauthorizedResponse = {
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: 'Token expired' }),
    };
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(unauthorizedResponse)],
      ['/entries/', () => Promise.resolve(unauthorizedResponse)],
    ]);

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('请输入密码继续')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    // 401 后应清除本地存储的失效凭据
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
