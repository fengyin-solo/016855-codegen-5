import { useContext } from 'react';
import type { ComponentProps } from 'react';
import { Button, Tooltip } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import type { ExtraProps } from 'react-markdown';
import { BlockViewContext } from './BlockViewContext';
import { getBlockKey, useBlockView } from '../../stores/blockViewStore';
import { getTableStats } from './markdownUtils';

type TableComponentProps = ComponentProps<'table'> & ExtraProps;

/** 超过该行数（含表头）的表格允许一键收起为标题栏 */
export const TABLE_LONG_THRESHOLD = 12;

/**
 * 增强表格
 * - 超出宽度时横向滚动，表头与列始终保持对齐（单个 table 渲染）
 * - 长表格带标题栏（行 × 列），可一键收起只留标题
 * - 展示状态按消息持久化，回到该回复时保持上次的展开/收起状态
 */
export function TableBlock({ node, children, ...rest }: TableComponentProps) {
  const { messageId } = useContext(BlockViewContext);

  const stats = getTableStats(node);
  const isLong = stats.rows > TABLE_LONG_THRESHOLD;

  const offset = node?.position?.start.offset;
  const blockKey = getBlockKey(messageId, 'table', offset);
  const [storedView, setView] = useBlockView(blockKey, 'expanded');
  const view = isLong ? storedView : 'expanded';

  const table = <table {...rest}>{children}</table>;

  // 短表格保持原有渲染：仅包一层可横向滚动的容器
  if (!isLong) {
    return <div className="table-wrapper">{table}</div>;
  }

  const toggleCollapse = () => {
    setView(view === 'collapsed' ? 'expanded' : 'collapsed');
  };

  return (
    <div className={`table-block view-${view}`}>
      <div className="table-header">
        <span className="table-title">
          表格 · {stats.rows} 行 × {stats.cols} 列
        </span>
        <Tooltip title={view === 'collapsed' ? '展开表格' : '收起为标题'}>
          <Button
            type="text"
            size="small"
            icon={view === 'collapsed' ? <DownOutlined /> : <UpOutlined />}
            onClick={toggleCollapse}
            className="table-toggle"
            aria-label={view === 'collapsed' ? '展开表格' : '收起为标题'}
          />
        </Tooltip>
      </div>
      {view !== 'collapsed' && <div className="table-wrapper">{table}</div>}
    </div>
  );
}
