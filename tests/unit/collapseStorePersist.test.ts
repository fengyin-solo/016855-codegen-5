import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * 持久化测试：收起/展开状态写入 localStorage，
 * 重新加载（重新创建 store）后恢复，回到同一条回复时展示方式与上次相同
 */
describe('collapseStore 持久化', () => {
  let storageData: Record<string, string>;

  beforeEach(() => {
    storageData = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageData[key] ?? null,
      setItem: (key: string, value: string) => {
        storageData[key] = value;
      },
      removeItem: (key: string) => {
        delete storageData[key];
      },
    });
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('消息收起状态在重新加载后恢复', async () => {
    const first = await import('../../src/stores/collapseStore');
    first.useCollapseStore.getState().toggleMessageCollapsed('msg-long-1');
    expect(storageData['react-chat-collapse-state']).toBeTruthy();

    // 模拟刷新页面 / 重新进入：重新创建 store 并从 localStorage 水合
    vi.resetModules();
    const second = await import('../../src/stores/collapseStore');

    const state = second.useCollapseStore.getState();
    expect(second.selectMessageCollapsed('msg-long-1')(state)).toBe(true);
  });

  it('代码块展开状态在重新加载后恢复', async () => {
    const first = await import('../../src/stores/collapseStore');
    // 长代码块默认收起，用户点击展开
    first.useCollapseStore.getState().toggleCodeBlock('msg-1:code:0', false);

    vi.resetModules();
    const second = await import('../../src/stores/collapseStore');

    const state = second.useCollapseStore.getState();
    expect(second.selectCodeBlockExpanded('msg-1:code:0', false)(state)).toBe(true);
  });

  it('持久化数据只包含状态记录，不包含函数', async () => {
    const mod = await import('../../src/stores/collapseStore');
    mod.useCollapseStore.getState().toggleMessageCollapsed('msg-1');

    const persisted = JSON.parse(storageData['react-chat-collapse-state'] ?? '{}');
    expect(persisted.state.collapsedMessages).toEqual({ 'msg-1': true });
    expect(typeof persisted.state.toggleMessageCollapsed).toBe('undefined');
  });
});
