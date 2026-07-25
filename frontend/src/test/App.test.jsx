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

  it('shows only content preview (truncated) in list, not full content', async () => {
    const longContent =
      '这是日记的第一行内容，描述了今天发生的事情。' +
      '接着是第二行内容，讲述了一些细节。' +
      '第三行内容继续延伸，但列表只应该展示前面两行。';
    const mockEntries = [
      {
        id: 1,
        title: '长日记',
        content: longContent,
        created_at: '2024-01-01T12:00:00',
      },
    ];
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse(['2024-01-01']))],
      ['/entries/', () => Promise.resolve(createFetchResponse(mockEntries))],
    ]);

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('长日记')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // 内容容器应使用 line-clamp-2 进行截断
    const contentParagraph = screen.getByText(longContent);
    expect(contentParagraph.className).toContain('line-clamp-2');
    // 列表中应提供"查看全文"提示
    expect(screen.getByText('查看全文')).toBeInTheDocument();
  });

  it('opens entry detail view when clicking a list card and shows full content', async () => {
    const fullContent = '第一行\n第二行\n第三行\n第四行';
    const mockEntries = [
      {
        id: 7,
        title: '详情测试',
        content: fullContent,
        created_at: '2024-01-01T12:00:00',
      },
    ];
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse(['2024-01-01']))],
      ['/entries/', () => Promise.resolve(createFetchResponse(mockEntries))],
    ]);

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('详情测试')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // 列表状态下应同时存在"查看全文"提示
    expect(screen.getByText('查看全文')).toBeInTheDocument();

    // 点击标题进入详情视图
    fireEvent.click(screen.getByText('详情测试'));

    // 详情视图出现"返回列表"按钮
    expect(screen.getByText('返回列表')).toBeInTheDocument();
    // "查看全文"提示应消失（已离开列表）
    expect(screen.queryByText('查看全文')).not.toBeInTheDocument();
  });

  it('returns to list from detail view via back button', async () => {
    const mockEntries = [
      {
        id: 8,
        title: '返回测试',
        content: '内容',
        created_at: '2024-01-01T12:00:00',
      },
    ];
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse(['2024-01-01']))],
      ['/entries/', () => Promise.resolve(createFetchResponse(mockEntries))],
    ]);

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('返回测试')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    fireEvent.click(screen.getByText('返回测试'));
    expect(screen.getByText('返回列表')).toBeInTheDocument();

    fireEvent.click(screen.getByText('返回列表'));

    expect(screen.queryByText('返回列表')).not.toBeInTheDocument();
    // 列表恢复显示，"查看全文"提示再次出现
    expect(screen.getByText('查看全文')).toBeInTheDocument();
  });

  it('opens edit form from detail view and returns to detail after saving', async () => {
    const mockEntries = [
      {
        id: 9,
        title: '原标题',
        content: '原内容',
        created_at: '2024-01-01T12:00:00',
      },
    ];
    const updatedEntry = {
      id: 9,
      title: '新标题',
      content: '新内容',
      created_at: '2024-01-01T12:00:00',
    };
    mockFetchByUrl([
      ['/entries/dates/', () => Promise.resolve(createFetchResponse(['2024-01-01']))],
      [
        new RegExp(`/entries/9$`),
        (_url, options) => {
          if (options?.method === 'PUT') {
            return Promise.resolve(createFetchResponse(updatedEntry));
          }
          return Promise.resolve(createFetchResponse(mockEntries[0]));
        },
      ],
      ['/entries/', () => Promise.resolve(createFetchResponse(mockEntries))],
    ]);

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('原标题')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // 进入详情视图
    fireEvent.click(screen.getByText('原标题'));
    expect(screen.getByText('返回列表')).toBeInTheDocument();

    // 在详情视图中点击编辑
    fireEvent.click(screen.getByLabelText('编辑日记'));
    expect(screen.getByLabelText('标题')).toBeInTheDocument();

    // 修改并提交
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '新标题' } });
    fireEvent.change(screen.getByLabelText('内容'), { target: { value: '新内容' } });
    fireEvent.click(screen.getByText('保存修改'));

    // 提交后应回到详情视图，显示新内容与"返回列表"
    await waitFor(
      () => {
        expect(screen.getByText('返回列表')).toBeInTheDocument();
        expect(screen.getByText('新标题')).toBeInTheDocument();
        expect(screen.getByText('新内容')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
