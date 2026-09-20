import { useContext } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import { Button, Tooltip } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import type { ExtraProps } from 'react-markdown';
import { CopyButton } from './CopyButton';
import { BlockViewContext, InsidePreContext } from './BlockViewContext';
import { getBlockKey, useBlockViewStore } from '../../stores/blockViewStore';
import type { BlockView } from '../../stores/blockViewStore';
import { getNodeText, splitCodeLines, trimTrailingNewline } from './markdownUtils';

type CodeComponentProps = ComponentProps<'code'> & ExtraProps;

/** 超过该行数才启用 预览/收起 功能 */
export const CODE_LONG_THRESHOLD = 12;
/** 预览模式下可见的行数（同步到 CSS 变量 --code-preview-lines） */
export const CODE_PREVIEW_LINES = 8;

/**
 * 增强代码块
 * - 头部显示语言标识与行数，保留原有复制按钮
 * - 行号与代码行一一对齐，横向滚动时行号列固定在左侧
 * - 长代码默认只显示前几行，可展开全部或一键收起为标题栏
 * - 展示状态按消息持久化，回到该回复时保持上次的展开/收起状态
 */
export function CodeBlock({ node, className, children, ...rest }: CodeComponentProps) {
  const { messageId, isStreaming } = useContext(BlockViewContext);
  const insidePre = useContext(InsidePreContext);

  const match = /language-(\w+)/.exec(className || '');
  const language = match?.[1] ?? '';

  const rawText = getNodeText(node);
  // 围栏代码块一定位于 pre 内；不在 pre 内的即为行内代码
  const isInline = !insidePre && !match && !rawText.includes('\n');

  const offset = node?.position?.start.offset;
  const blockKey = getBlockKey(messageId, 'code', offset);
  const storedView = useBlockViewStore(state => state.views[blockKey]);
  const setView = useBlockViewStore(state => state.setView);

  if (isInline) {
    return (
      <code className="inline-code" {...rest}>
        {children}
      </code>
    );
  }

  const lines = splitCodeLines(rawText);
  const lineCount = lines.length;
  const copyText = lines.join('\n');
  const isLong = lineCount > CODE_LONG_THRESHOLD;
  // 短代码块始终完整展示；长代码块：用户的选择优先，
  // 否则流式输出期间保持展开（不裁切正在到达的内容），结束后默认预览
  const view: BlockView = !isLong
    ? 'expanded'
    : (storedView ?? (isStreaming ? 'expanded' : 'preview'));

  // 裁掉末尾换行，保证渲染行数与行号数量一致
  const trimmedChildren = trimTrailingNewline(children);

  const toggleCollapse = () => {
    setView(blockKey, view === 'collapsed' ? 'preview' : 'collapsed');
  };

  const togglePreview = () => {
    setView(blockKey, view === 'preview' ? 'expanded' : 'preview');
  };

  const blockStyle = {
    '--code-preview-lines': String(CODE_PREVIEW_LINES),
  } as CSSProperties;

  return (
    <div className={`code-block view-${view}${isLong ? ' is-long' : ''}`} style={blockStyle}>
      <div className="code-header">
        <span className="code-language">{language || 'code'}</span>
        <span className="code-meta">{lineCount} 行</span>
        <div className="code-actions">
          <CopyButton text={copyText} size="small" />
          {isLong && (
            <Tooltip title={view === 'collapsed' ? '展开代码' : '收起为标题'}>
              <Button
                type="text"
                size="small"
                icon={view === 'collapsed' ? <DownOutlined /> : <UpOutlined />}
                onClick={toggleCollapse}
                className="code-toggle"
                style={{ color: '#888' }}
                aria-label={view === 'collapsed' ? '展开代码' : '收起为标题'}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {view !== 'collapsed' && (
        <div className={`code-body${view === 'preview' ? ' is-preview' : ''}`}>
          <div className="code-scroll">
            <div className="code-gutter" aria-hidden="true">
              {Array.from({ length: lineCount }, (_, i) => (
                <span key={i + 1}>{i + 1}</span>
              ))}
            </div>
            <pre className="code-pre">
              <code className={className} {...rest}>
                {trimmedChildren}
              </code>
            </pre>
          </div>
          {view === 'preview' && <div className="code-fade" />}
        </div>
      )}

      {isLong && view !== 'collapsed' && (
        <button type="button" className="code-expand-bar" onClick={togglePreview}>
          <span>{view === 'preview' ? `展开全部 ${lineCount} 行` : '收起'}</span>
          {view === 'preview' ? <DownOutlined /> : <UpOutlined />}
        </button>
      )}
    </div>
  );
}
