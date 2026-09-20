import { describe, it, expect, vi, beforeEach } from 'vitest';

// 在模块加载前准备好 localStorage stub（store 加载时会读取）
const mock = vi.hoisted(() => {
  const data: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => (key in data ? data[key] ?? null : null),
    setItem: (key: string, value: string) => {
      data[key] = String(value);
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    clear: () => {
      for (const k of Object.keys(data)) delete data[k];
    },
  };
  (globalThis as Record<string, unknown>).localStorage = storage;
  return { data, storage };
});

const STORAGE_KEY = 'react-chat-block-views';

async function loadStore() {
  vi.resetModules();
  return import('@/stores/blockViewStore');
}

beforeEach(() => {
  mock.storage.clear();
});

describe('blockViewStore', () => {
  it('初始状态为空', async () => {
    const { useBlockViewStore } = await loadStore();
    expect(useBlockViewStore.getState().views).toEqual({});
  });

  it('setView 更新状态并持久化到 localStorage', async () => {
    const { useBlockViewStore } = await loadStore();
    useBlockViewStore.getState().setView('m1:code:0', 'collapsed');

    expect(useBlockViewStore.getState().views['m1:code:0']).toBe('collapsed');

    const raw = mock.data[STORAGE_KEY];
    expect(raw).toBeDefined();
    expect(JSON.parse(raw ?? '{}')).toEqual({ 'm1:code:0': 'collapsed' });
  });

  it('重新加载后恢复上次的展示状态（回到回复时保持一致）', async () => {
    const first = await loadStore();
    first.useBlockViewStore.getState().setView('m1:code:0', 'expanded');
    first.useBlockViewStore.getState().setView('m1:table:120', 'collapsed');

    // 模拟重新进入：重新加载模块，从 localStorage 恢复
    const second = await loadStore();
    expect(second.useBlockViewStore.getState().views).toEqual({
      'm1:code:0': 'expanded',
      'm1:table:120': 'collapsed',
    });
  });

  it('不同回复的块互不影响', async () => {
    const { useBlockViewStore } = await loadStore();
    useBlockViewStore.getState().setView('m1:code:0', 'collapsed');
    useBlockViewStore.getState().setView('m2:code:0', 'expanded');

    expect(useBlockViewStore.getState().views['m1:code:0']).toBe('collapsed');
    expect(useBlockViewStore.getState().views['m2:code:0']).toBe('expanded');
  });

  it('存储内容损坏时回退为空状态', async () => {
    mock.data[STORAGE_KEY] = '{not valid json';
    const { useBlockViewStore } = await loadStore();
    expect(useBlockViewStore.getState().views).toEqual({});
  });

  it('过滤非法的状态值', async () => {
    mock.data[STORAGE_KEY] = JSON.stringify({
      'm1:code:0': 'collapsed',
      'm1:code:1': 'not-a-view',
      'm1:code:2': 42,
    });
    const { useBlockViewStore } = await loadStore();
    expect(useBlockViewStore.getState().views).toEqual({ 'm1:code:0': 'collapsed' });
  });

  it('getBlockKey 生成稳定的块 key', async () => {
    const { getBlockKey } = await loadStore();
    expect(getBlockKey('m1', 'code', 0)).toBe('m1:code:0');
    expect(getBlockKey('m1', 'table', 250)).toBe('m1:table:250');
    expect(getBlockKey(undefined, 'code', 3)).toBe('standalone:code:3');
    expect(getBlockKey('m1', 'code', undefined)).toBe('m1:code:0');
  });
});
