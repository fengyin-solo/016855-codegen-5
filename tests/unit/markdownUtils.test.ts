import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import {
  getNodeText,
  splitCodeLines,
  trimTrailingNewline,
  getTableStats,
} from '@/components/Common/markdownUtils';

describe('getNodeText', () => {
  it('提取纯文本节点', () => {
    expect(getNodeText({ type: 'text', value: 'hello' })).toBe('hello');
  });

  it('递归拼接嵌套节点（模拟高亮 span）', () => {
    const node = {
      type: 'element',
      tagName: 'code',
      children: [
        { type: 'element', tagName: 'span', children: [{ type: 'text', value: 'const ' }] },
        { type: 'text', value: 'a = 1;\n' },
      ],
    };
    expect(getNodeText(node)).toBe('const a = 1;\n');
  });

  it('非法输入返回空串', () => {
    expect(getNodeText(undefined)).toBe('');
    expect(getNodeText(null)).toBe('');
    expect(getNodeText('string')).toBe('');
  });
});

describe('splitCodeLines', () => {
  it('按行拆分', () => {
    expect(splitCodeLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('去掉结尾一个换行，行数不多算', () => {
    expect(splitCodeLines('a\nb\n')).toEqual(['a', 'b']);
  });

  it('保留中间的空行', () => {
    expect(splitCodeLines('a\n\nb')).toEqual(['a', '', 'b']);
  });

  it('空内容视为 1 行', () => {
    expect(splitCodeLines('')).toEqual(['']);
  });
});

describe('trimTrailingNewline', () => {
  it('去掉字符串末尾换行', () => {
    expect(trimTrailingNewline('abc\n')).toBe('abc');
    expect(trimTrailingNewline('abc')).toBe('abc');
  });

  it('处理数组：裁掉最后一个文本节点的换行', () => {
    const result = trimTrailingNewline(['const a = 1;', '\n']) as unknown[];
    expect(result).toEqual(['const a = 1;']);
  });

  it('数组末尾换行被裁成空串时移除该节点', () => {
    const result = trimTrailingNewline(['line1\nline2', '\n']) as unknown[];
    expect(result).toHaveLength(1);
  });

  it('递归处理嵌套元素（高亮 span）', () => {
    const span = createElement('span', { key: '1' }, 'const x = 1\n');
    const result = trimTrailingNewline([span]) as ReactElement[];
    expect(result).toHaveLength(1);
    const inner = result[0] as ReactElement<{ children: string }>;
    expect(inner.props.children).toBe('const x = 1');
  });

  it('没有末尾换行时保持原样', () => {
    const input = ['a', 'b'];
    expect(trimTrailingNewline(input)).toBe(input);
  });
});

describe('getTableStats', () => {
  const tableNode = {
    tagName: 'table',
    children: [
      {
        tagName: 'thead',
        children: [
          {
            tagName: 'tr',
            children: [{ tagName: 'th' }, { tagName: 'th' }, { tagName: 'th' }],
          },
        ],
      },
      {
        tagName: 'tbody',
        children: [
          { tagName: 'tr', children: [{ tagName: 'td' }, { tagName: 'td' }, { tagName: 'td' }] },
          { tagName: 'tr', children: [{ tagName: 'td' }, { tagName: 'td' }, { tagName: 'td' }] },
        ],
      },
    ],
  };

  it('统计行数（含表头）与列数', () => {
    expect(getTableStats(tableNode)).toEqual({ rows: 3, cols: 3 });
  });

  it('空节点返回 0', () => {
    expect(getTableStats(undefined)).toEqual({ rows: 0, cols: 0 });
  });
});
