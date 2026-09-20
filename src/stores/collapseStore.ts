import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

// 非浏览器环境（如单元测试）下的内存回退存储
const memoryStorage: StateStorage = (() => {
  const map = new Map<string, string>();
  return {
    getItem: name => map.get(name) ?? null,
    setItem: (name, value) => {
      map.set(name, value);
    },
    removeItem: name => {
      map.delete(name);
    },
  };
})();

const getStorage = (): StateStorage =>
  typeof localStorage !== 'undefined' ? localStorage : memoryStorage;

interface CollapseState {
  /** 消息级收起状态：messageId -> 是否已收起 */
  collapsedMessages: Record<string, boolean>;
  /** 代码块展开状态覆盖：blockKey -> 是否展开（未设置时按默认规则） */
  codeBlockExpanded: Record<string, boolean>;
}

interface CollapseActions {
  /** 切换某条消息的收起状态 */
  toggleMessageCollapsed: (messageId: string) => void;
  /** 切换某个代码块的展开状态 */
  toggleCodeBlock: (blockKey: string, defaultExpanded: boolean) => void;
}

type CollapseStore = CollapseState & CollapseActions;

/**
 * 收起/展开状态存储
 * 持久化到 localStorage，切换对话或刷新后回到同一条回复时展示方式保持一致
 */
export const useCollapseStore = create<CollapseStore>()(
  persist(
    set => ({
      collapsedMessages: {},
      codeBlockExpanded: {},

      toggleMessageCollapsed: (messageId) => {
        set(state => ({
          collapsedMessages: {
            ...state.collapsedMessages,
            [messageId]: !state.collapsedMessages[messageId],
          },
        }));
      },

      toggleCodeBlock: (blockKey, defaultExpanded) => {
        set(state => {
          const current = state.codeBlockExpanded[blockKey] ?? defaultExpanded;
          return {
            codeBlockExpanded: {
              ...state.codeBlockExpanded,
              [blockKey]: !current,
            },
          };
        });
      },
    }),
    {
      name: 'react-chat-collapse-state',
      version: 1,
      storage: createJSONStorage(getStorage),
      partialize: state => ({
        collapsedMessages: state.collapsedMessages,
        codeBlockExpanded: state.codeBlockExpanded,
      }),
    }
  )
);

/** 读取某条消息是否已收起（默认展开） */
export const selectMessageCollapsed = (messageId: string) => (state: CollapseState) =>
  state.collapsedMessages[messageId] ?? false;

/** 读取某个代码块是否展开（未设置时使用默认规则） */
export const selectCodeBlockExpanded =
  (blockKey: string, defaultExpanded: boolean) => (state: CollapseState) =>
    state.codeBlockExpanded[blockKey] ?? defaultExpanded;
