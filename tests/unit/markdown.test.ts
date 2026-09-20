import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  countCodeLines,
  stripMarkdown,
  extractContentTitle,
  isLongContent,
  CODE_COLLAPSE_THRESHOLD,
  CODE_PREVIEW_LINES,
  MESSAGE_LONG_CHARS,
  MESSAGE_LONG_LINES,
} from '../../src/utils/markdown';

describe('countCodeLines', () => {
  it('空字符串为 0 行', () => {
    expect(countCodeLines('')).toBe(0);
  });

  it('单行代码为 1 行', () => {
    expect(countCodeLines('const a = 1;')).toBe(1);
  });

  it('多行代码行数正确', () => {
    expect(countCodeLines('a\nb\nc')).toBe(3);
  });

  it('忽略末尾的换行符', () => {
    expect(countCodeLines('a\nb\n')).toBe(2);
  });

  it('任意不含换行的行数组 join 后行数与长度一致（末行非空）', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.string().filter(s => !s.includes('\n')), { minLength: 1 })
          .filter(lines => lines[lines.length - 1] !== ''),
        lines => {
          expect(countCodeLines(lines.join('\n'))).toBe(lines.length);
        }
      )
    );
  });

  it('无末尾换行的非空字符串行数等于换行符数加一', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.length > 0 && !s.endsWith('\n')),
        s => {
          expect(countCodeLines(s)).toBe(s.split('\n').length);
        }
      )
    );
  });
});

describe('stripMarkdown', () => {
  it('去除标题标记', () => {
    expect(stripMarkdown('## 你好')).toBe('你好');
  });

  it('链接替换为链接文本', () => {
    expect(stripMarkdown('[示例](https://example.com)')).toBe('示例');
  });

  it('去除强调与行内代码标记', () => {
    expect(stripMarkdown('**加粗** 和 `code`')).toBe('加粗 和 code');
  });
});

describe('extractContentTitle', () => {
  it('优先取第一个 Markdown 标题', () => {
    expect(extractContentTitle('前言\n\n# 章节标题\n正文')).toBe('章节标题');
  });

  it('没有标题时取第一行非空文本', () => {
    expect(extractContentTitle('\n\n第一行内容\n第二行')).toBe('第一行内容');
  });

  it('超长标题被截断并带省略号', () => {
    const title = extractContentTitle('一'.repeat(100), 50);
    expect(title.length).toBe(51);
    expect(title.endsWith('…')).toBe(true);
  });

  it('空内容返回占位文本', () => {
    expect(extractContentTitle('')).toBe('（空内容）');
    expect(extractContentTitle('\n  \n')).toBe('（空内容）');
  });

  it('任意内容标题长度不超限且不为空', () => {
    fc.assert(
      fc.property(fc.string(), content => {
        const title = extractContentTitle(content, 50);
        expect(title.length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(51);
      })
    );
  });
});

describe('isLongContent', () => {
  it('短内容不需要收起', () => {
    expect(isLongContent('短回复')).toBe(false);
  });

  it('超过字符阈值判定为长内容', () => {
    expect(isLongContent('a'.repeat(MESSAGE_LONG_CHARS + 1))).toBe(true);
  });

  it('超过行数阈值判定为长内容', () => {
    expect(isLongContent('行\n'.repeat(MESSAGE_LONG_LINES + 1))).toBe(true);
  });
});

describe('代码块收起常量', () => {
  it('预览行数小于收起阈值', () => {
    expect(CODE_PREVIEW_LINES).toBeLessThan(CODE_COLLAPSE_THRESHOLD);
  });
});
