import { memo, useMemo } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components, ExtraProps } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { TableBlock } from './TableBlock';
import { BlockViewContext, InsidePreContext } from './BlockViewContext';
import type { BlockViewContextValue } from './BlockViewContext';
import './MarkdownRenderer.css';

type LinkComponentProps = ComponentProps<'a'> & ExtraProps;

/** 自定义链接渲染（保持原有行为：新窗口打开） */
function MarkdownLink({ node, href, children, ...props }: LinkComponentProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="markdown-link"
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * pre 直接透传子节点并标记 pre 上下文：
 * 代码块的容器样式由 CodeBlock 自己渲染，避免嵌套 pre 带来的重复边框与内边距
 */
function PrePassthrough({ children }: { children?: ReactNode }) {
  return <InsidePreContext.Provider value={true}>{children}</InsidePreContext.Provider>;
}

const markdownComponents: Components = {
  code: CodeBlock,
  table: TableBlock,
  pre: PrePassthrough,
  a: MarkdownLink,
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** 消息 id，用于持久化代码块 / 表格的展开收起状态 */
  messageId?: string;
  /** 是否正在流式输出（流式期间长代码块保持展开） */
  isStreaming?: boolean;
}

/**
 * Markdown 渲染组件
 * 支持代码高亮、表格、链接等
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = '',
  messageId,
  isStreaming = false,
}: MarkdownRendererProps) {
  const blockViewContext = useMemo<BlockViewContextValue>(
    () => ({ messageId, isStreaming }),
    [messageId, isStreaming],
  );

  return (
    <div className={`markdown-renderer ${className}`}>
      <BlockViewContext.Provider value={blockViewContext}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </BlockViewContext.Provider>
    </div>
  );
});
