import { createContext } from 'react';

export interface BlockViewContextValue {
  /** 当前回复的消息 id，用于隔离不同回复里块的展示状态 */
  messageId?: string;
  /** 当前回复是否正在流式输出（流式期间不裁切长代码块） */
  isStreaming?: boolean;
}

/**
 * 由 MarkdownRenderer 提供，CodeBlock / TableBlock 消费
 */
export const BlockViewContext = createContext<BlockViewContextValue>({});

/**
 * 标记 code 是否位于 pre 之内（围栏代码块），用于精确区分行内代码与代码块
 */
export const InsidePreContext = createContext(false);
