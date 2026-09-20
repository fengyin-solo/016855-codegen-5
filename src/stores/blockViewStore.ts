import { create } from 'zustand';

/**
 * 回复中代码块 / 表格的展示状态
 * - preview:   只显示前几行（长代码块默认）
 * - expanded:  完整展开
 * - collapsed: 一键收起，只留标题栏
 */
export type BlockView = 'preview' | 'expanded' | 'collapsed';

const STORAGE_KEY = 'react-chat-block-views';

const VALID_VIEWS: readonly BlockView[] = ['preview', 'expanded', 'collapsed'];

function isBlockView(value: unknown): value is BlockView {
  return typeof value === 'string' && (VALID_VIEWS as readonly string[]).includes(value);
}

/**
 * 从 localStorage 读取已保存的块视图状态
 */
function loadViews(): Record<string, BlockView> {
  try {
    if (typeof localStorage === 'undefined') return {};

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const views: Record<string, BlockView> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isBlockView(value)) {
        views[key] = value;
      }
    }
    return views;
  } catch (error) {
    console.error('Failed to load block views:', error);
    return {};
  }
}

/**
 * 将块视图状态写入 localStorage
 */
function persistViews(views: Record<string, BlockView>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch (error) {
    // 存储失败（如超出配额）不影响界面状态
    console.error('Failed to persist block views:', error);
  }
}

interface BlockViewStore {
  /** 块 key -> 展示状态 */
  views: Record<string, BlockView>;
  /** 设置某个块的展示状态（自动持久化） */
  setView: (key: string, view: BlockView) => void;
}

export const useBlockViewStore = create<BlockViewStore>((set, get) => ({
  views: loadViews(),

  setView: (key, view) => {
    const views = { ...get().views, [key]: view };
    set({ views });
    persistViews(views);
  },
}));

/**
 * 生成块的稳定 key：同一条回复内按内容偏移定位，回复之间用 messageId 隔离
 */
export function getBlockKey(
  messageId: string | undefined,
  kind: 'code' | 'table',
  offset: number | undefined,
): string {
  return `${messageId ?? 'standalone'}:${kind}:${offset ?? 0}`;
}

/**
 * 读取 / 更新某个块的展示状态
 * @param key 由 getBlockKey 生成
 * @param fallback 没有历史记录时的默认状态
 */
export function useBlockView(
  key: string,
  fallback: BlockView,
): [BlockView, (view: BlockView) => void] {
  const stored = useBlockViewStore(state => state.views[key]);
  const setView = useBlockViewStore(state => state.setView);
  return [stored ?? fallback, (view: BlockView) => setView(key, view)];
}
