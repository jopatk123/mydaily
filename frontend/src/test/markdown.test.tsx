import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownView from '../features/entries/MarkdownView';
import { toPlainExcerpt } from '../lib/markdown';

describe('markdown', () => {
  it('renders raw html as text instead of executing it', () => {
    const { container } = render(<MarkdownView content={'你好<script>alert(1)</script>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/alert\(1\)/)).toBeInTheDocument();
  });

  it('keeps single line breaks from older plain-text entries', () => {
    const { container } = render(<MarkdownView content={'第一行\n第二行'} />);
    expect(container.querySelector('br')).not.toBeNull();
    expect(container.textContent).toContain('第一行');
    expect(container.textContent).toContain('第二行');
  });

  it('strips markers for list excerpts', () => {
    expect(toPlainExcerpt('## 标题\n\n**重点** 与 [链接](https://example.com)')).toBe(
      '标题 重点 与 链接',
    );
  });
});
