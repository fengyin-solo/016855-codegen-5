import { isValidElement, cloneElement } from 'react';
import type { ReactNode } from 'react';

/**
 * 移除 React 子节点树中末尾的换行符
 * 代码高亮后的内容末尾常带一个 '\n'，会在 pre 中多渲染出一个空行，
 * 移除后行号与代码内容才能一一对齐
 */
export function trimTrailingNewline(node: ReactNode): ReactNode {
  if (typeof node === 'string') {
    return node.replace(/\n$/, '');
  }

  if (Array.isArray(node)) {
    const result = [...node];
    for (let i = result.length - 1; i >= 0; i--) {
      const trimmed = trimTrailingNewline(result[i]);
      if (trimmed === '' || (Array.isArray(trimmed) && trimmed.length === 0)) {
        // 末尾节点被完全裁掉，继续处理前一个
        result.splice(i, 1);
        continue;
      }
      result[i] = trimmed;
      break;
    }
    return result;
  }

  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children != null) {
    return cloneElement(node, undefined, trimTrailingNewline(node.props.children));
  }

  return node;
}
