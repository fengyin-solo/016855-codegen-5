import { memo } from 'react';
import { Avatar, Button, Tooltip } from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  CompressOutlined,
  ExpandOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { Message } from '../../types';
import { MarkdownRenderer } from '../Common/MarkdownRenderer';
import { CopyButton } from '../Common/CopyButton';
import { TypingIndicator } from '../Common/LoadingIndicator';
import { formatResponseTime, formatTokenCount } from '../../utils/formatters';
import { isLongContent, extractContentTitle } from '../../utils/markdown';
import { useCollapseStore, selectMessageCollapsed } from '../../stores/collapseStore';
import './MessageItem.css';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}

/**
 * 消息项组件
 */
export const MessageItem = memo(function MessageItem({
  message,
  isStreaming = false,
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const showStats = isAssistant && message.status === 'complete' && message.stats;

  // 特别长的回复支持一键收起，只留标题；收起状态持久化，回到该回复时保持一致
  const collapsible =
    isAssistant && message.status === 'complete' && isLongContent(message.content);
  const collapsed = useCollapseStore(selectMessageCollapsed(message.id));
  const toggleMessageCollapsed = useCollapseStore(state => state.toggleMessageCollapsed);
  const showCollapsed = collapsible && collapsed;

  return (
    <div
      className={`message-item ${isUser ? 'user' : 'assistant'}${showCollapsed ? ' collapsed' : ''} animate-fadeInUp`}
    >
      <div className="message-avatar">
        <Avatar
          size={36}
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          style={{
            backgroundColor: isUser ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
            color: isUser ? 'white' : 'var(--color-text-secondary)',
          }}
        />
      </div>

      <div className="message-content-wrapper">
        <div className={`message-bubble ${message.status}`}>
          {isStreaming && message.status === 'streaming' && !message.content ? (
            <TypingIndicator />
          ) : (
            <div className="message-content">
              {isUser ? (
                <p>{message.content}</p>
              ) : showCollapsed ? (
                <button
                  type="button"
                  className="message-collapsed-summary"
                  onClick={() => toggleMessageCollapsed(message.id)}
                >
                  <RightOutlined className="collapsed-icon" />
                  <span className="collapsed-title">
                    {extractContentTitle(message.content)}
                  </span>
                  <span className="collapsed-hint">内容已收起，点击展开</span>
                </button>
              ) : (
                <MarkdownRenderer content={message.content} messageId={message.id} />
              )}
            </div>
          )}

          {message.status === 'error' && (
            <div className="message-error">
              <span>消息发送失败</span>
            </div>
          )}
        </div>

        <div className="message-footer">
          {showStats && message.stats && (
            <div className="message-stats">
              <span className="stat-item">
                {formatResponseTime(message.stats.responseTime)}
              </span>
              <span className="stat-divider">·</span>
              <span className="stat-item">
                {formatTokenCount(message.stats.tokenCount)} tokens
              </span>
            </div>
          )}

          {isAssistant && message.content && message.status === 'complete' && (
            <div className="message-actions">
              {collapsible && (
                <Tooltip title={showCollapsed ? '展开内容' : '收起内容'}>
                  <Button
                    type="text"
                    size="small"
                    icon={showCollapsed ? <ExpandOutlined /> : <CompressOutlined />}
                    onClick={() => toggleMessageCollapsed(message.id)}
                    className="collapse-toggle-button"
                  />
                </Tooltip>
              )}
              <CopyButton text={message.content} size="small" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
