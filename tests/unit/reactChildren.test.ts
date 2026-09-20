import { describe, it, expect } from 'vitest';
import { createElement, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { trimTrailingNewline } from '../../src/utils/reactChildren';

/** 递归提取 React 节点树中的全部文本 */
function toText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return toText(node.props.children);
  return '';
}

describe('trimTrailingNewline', () => {
  it('移除字符串末尾的换行符', () => {
    expect(trimTrailingNewline('code\n')).toBe('code');
  });

  it('只移除末尾一个换行符，保留中间内容', () => {
    expect(trimTrailingNewline('a\nb\n')).toBe('a\nb');
  });

  it('处理数组末尾的换行符', () => {
    const nodes = [createElement('span', { key: '1' }, 'const a'), '\n'];
    const trimmed = trimTrailingNewline(nodes);
    expect(toText(trimmed)).toBe('const a');
  });

  it('处理嵌套元素末尾的换行符', () => {
    const nodes = createElement(
      'code',
      null,
      createElement('span', null, 'line1\nline2'),
      '\n'
    );
    const trimmed = trimTrailingNewline(nodes);
    expect(toText(trimmed)).toBe('line1\nline2');
  });

  it('末尾换行在嵌套元素内部时也能移除', () => {
    const nodes = createElement(
      'code',
      null,
      createElement('span', null, 'a'),
      createElement('span', null, 'b\n')
    );
    const trimmed = trimTrailingNewline(nodes);
    expect(toText(trimmed)).toBe('ab');
  });

  it('没有末尾换行时内容不变', () => {
    const nodes = [createElement('span', { key: '1' }, 'abc')];
    expect(toText(trimTrailingNewline(nodes))).toBe('abc');
  });
});
