import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCollapseStore,
  selectMessageCollapsed,
  selectCodeBlockExpanded,
} from '../../src/stores/collapseStore';

const resetStore = () => {
  useCollapseStore.setState({ collapsedMessages: {}, codeBlockExpanded: {} });
};

describe('collapseStore', () => {
  beforeEach(resetStore);

  describe('消息级收起', () => {
    it('消息默认展开', () => {
      expect(selectMessageCollapsed('msg-1')(useCollapseStore.getState())).toBe(false);
    });

    it('切换后收起，再次切换恢复展开（同一回复内保持一致）', () => {
      const { toggleMessageCollapsed } = useCollapseStore.getState();

      toggleMessageCollapsed('msg-1');
      expect(selectMessageCollapsed('msg-1')(useCollapseStore.getState())).toBe(true);

      toggleMessageCollapsed('msg-1');
      expect(selectMessageCollapsed('msg-1')(useCollapseStore.getState())).toBe(false);
    });

    it('不同消息的收起状态互不影响', () => {
      useCollapseStore.getState().toggleMessageCollapsed('msg-1');

      const state = useCollapseStore.getState();
      expect(selectMessageCollapsed('msg-1')(state)).toBe(true);
      expect(selectMessageCollapsed('msg-2')(state)).toBe(false);
    });
  });

  describe('代码块展开状态', () => {
    it('未设置时使用默认规则', () => {
      const state = useCollapseStore.getState();
      expect(selectCodeBlockExpanded('m:code:0', false)(state)).toBe(false);
      expect(selectCodeBlockExpanded('m:code:0', true)(state)).toBe(true);
    });

    it('从默认收起切换为展开，再次切换恢复收起', () => {
      const { toggleCodeBlock } = useCollapseStore.getState();

      toggleCodeBlock('m:code:0', false);
      expect(selectCodeBlockExpanded('m:code:0', false)(useCollapseStore.getState())).toBe(true);

      toggleCodeBlock('m:code:0', false);
      expect(selectCodeBlockExpanded('m:code:0', false)(useCollapseStore.getState())).toBe(false);
    });

    it('已有覆盖值时基于覆盖值切换，与默认值无关', () => {
      const { toggleCodeBlock } = useCollapseStore.getState();

      toggleCodeBlock('m:code:0', false); // -> true
      // 再次调用时即使传入不同的默认值，也基于当前实际状态切换
      toggleCodeBlock('m:code:0', true);
      expect(selectCodeBlockExpanded('m:code:0', false)(useCollapseStore.getState())).toBe(false);
    });

    it('同一条回复里的多个代码块状态互不影响', () => {
      const { toggleCodeBlock } = useCollapseStore.getState();

      toggleCodeBlock('m:code:0', false);
      toggleCodeBlock('m:code:1', false);

      useCollapseStore.getState().toggleCodeBlock('m:code:0', false);

      const state = useCollapseStore.getState();
      expect(selectCodeBlockExpanded('m:code:0', false)(state)).toBe(false);
      expect(selectCodeBlockExpanded('m:code:1', false)(state)).toBe(true);
    });
  });
});
