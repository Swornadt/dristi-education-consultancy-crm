import { Card, Result, Space, Tag } from 'antd';
import { useAuth } from '../auth/AuthContext';

// Stand-in page for modules that are not built yet.
// It also lists what this role may do in the module, which makes it easy to check the permission matrix.
export default function ModulePlaceholder({ item }) {
  const { user } = useAuth();
  const grants = user.permissions.filter((p) => p.module === item.module);

  return (
    <Card>
      <Result
        icon={item.icon}
        title={item.label}
        subTitle={`This page is planned for week ${item.plannedWeek}.`}
        extra={
          <Space wrap>
            {grants.map((p) => (
              <Tag key={p.action}>
                {p.action}: {p.scope}
              </Tag>
            ))}
          </Space>
        }
      />
    </Card>
  );
}
