import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { trimTrailingNewline } from '../../utils/reactChildren';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** 所属消息 ID，用于生成稳定的代码块标识以持久化展开状态 */
  messageId?: string;
}

/** hast 节点的最小结构 */
interface HastNodeLike {
  type?: string;
  value?: string;
  children?: HastNodeLike[];
}

/** 从 hast 节点提取纯文本（高亮后 children 是 React 元素数组，不能直接 String()） */
function extractText(node: HastNodeLike | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(extractText).join('');
}

/**
 * Markdown 渲染组件
 * 支持代码高亮、表格、链接等
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = '',
  messageId,
}: MarkdownRendererProps) {
  // 代码块序号：同一条消息内按出现顺序生成稳定 key
  let codeBlockIndex = 0;

  return (
    <div className={`markdown-renderer ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 代码块由 code 渲染器完整输出（含自己的 pre），去掉默认的 pre 包裹
          pre({ children }) {
            return <>{children}</>;
          },
          // 自定义代码块渲染
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match?.[1] ?? '';
            const rawCode = extractText(node as HastNodeLike | undefined);
            const isInline = !match && !rawCode.includes('\n');

            if (isInline) {
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            }

            const codeContent = rawCode.replace(/\n$/, '');
            const blockKey = `${messageId ?? 'standalone'}:code:${codeBlockIndex++}`;

            return (
              <CodeBlock
                language={language}
                code={codeContent}
                blockKey={blockKey}
                codeClassName={className}
              >
                {trimTrailingNewline(children)}
              </CodeBlock>
            );
          },
          // 自定义链接渲染
          a({ node, href, children, ...props }) {
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
          },
          // 自定义表格渲染
          table({ node, children, ...props }) {
            return (
              <div className="table-wrapper">
                <table {...props}>{children}</table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
