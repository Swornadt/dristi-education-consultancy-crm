import { Empty, Typography, theme } from 'antd';

// A simple horizontal bar list: items = [{ key, label, value }]. No chart library needed.
export default function BarList({ items, emptyText = 'Nothing to show yet.' }) {
  const { token } = theme.useToken();
  if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;

  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {items.map((item) => (
        <div key={item.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span>{item.label}</span>
            <Typography.Text strong>{item.value}</Typography.Text>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: token.colorFillSecondary }}>
            <div
              style={{
                width: `${(item.value / max) * 100}%`,
                minWidth: item.value ? 4 : 0,
                height: '100%',
                borderRadius: 4,
                background: token.colorPrimary,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
