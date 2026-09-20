import { memo, useMemo } from 'react';
import { ShrinkOutlined, ArrowsAltOutlined } from '@ant-design/icons';
import { CopyButton } from './CopyButton';
import { useCollapseStore, selectCodeBlockExpanded } from '../../stores/collapseStore';
import { countCodeLines, CODE_COLLAPSE_THRESHOLD, CODE_PREVIEW_LINES } from '../../utils/markdown';
import './CodeBlock.css';

interface CodeBlockProps {
  /** 代码语言标识 */
  language: string;
  /** 原始代码文本（用于复制与行数统计） */
  code: string;
  /** 稳定标识，用于持久化展开/收起状态 */
  blockKey: string;
  /** 透传给 code 元素的类名（语法高亮） */
  codeClassName?: string | undefined;
  /** 高亮后的代码节点 */
  children: React.ReactNode;
}

/**
 * 代码块组件
 * 带语言标识、行号与复制功能；行数过多时默认收起，仅显示前几行
 */
export const CodeBlock = memo(function CodeBlock({
  language,
  code,
  blockKey,
  codeClassName,
  children,
}: CodeBlockProps) {
  const lineCount = useMemo(() => countCodeLines(code), [code]);
  const collapsible = lineCount > CODE_COLLAPSE_THRESHOLD;

  // 展开状态持久化：未手动设置时，可收起的代码块默认收起
  const expanded = useCollapseStore(selectCodeBlockExpanded(blockKey, !collapsible));
  const toggleCodeBlock = useCollapseStore(state => state.toggleCodeBlock);

  // 行号与代码内容一一对应：行号列与代码列使用相同的字体与行高
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join('\n'),
    [lineCount]
  );

  const collapsed = collapsible && !expanded;

  return (
    <div className={`code-block${collapsed ? ' collapsed' : ''}`}>
      <div className="code-header">
        <span className="code-language">{language || 'code'}</span>
        <CopyButton text={code} size="small" />
      </div>

      <div className="code-content">
        <div
          className="code-body"
          style={{ ['--preview-lines' as string]: CODE_PREVIEW_LINES }}
        >
          <pre className="code-line-numbers" aria-hidden="true">
            {lineNumbers}
          </pre>
          <pre className="code-scroll">
            <code className={codeClassName}>{children}</code>
          </pre>
        </div>
      </div>

      {collapsible && (
        <button
          type="button"
          className="code-toggle"
          onClick={() => toggleCodeBlock(blockKey, !collapsible)}
        >
          {collapsed ? (
            <>
              <ArrowsAltOutlined /> 展开全部 {lineCount} 行
            </>
          ) : (
            <>
              <ShrinkOutlined /> 收起
            </>
          )}
        </button>
      )}
    </div>
  );
});
