import { useEffect, useState } from 'react';
import { Alert, Space, Table, Tag, Typography } from 'antd';
import { listRoles } from '../../api/users';
import { ROLE_LABELS } from '../../theme';

const MODULES = [
  { key: 'leads', label: 'Leads' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'students', label: 'Students' },
  { key: 'documents', label: 'Documents' },
  { key: 'applications', label: 'Applications' },
  { key: 'catalog', label: 'Universities and programs' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Users' },
];
const ACTIONS = ['view', 'create', 'update', 'delete'];

// Read-only view of what each role may do, straight from GET /roles.
export default function PermissionMatrix() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listRoles()
      .then((rows) => {
        if (!cancelled) setRoles(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cell = (role, module) => {
    const grants = ACTIONS.map((action) => role.permissions.find((p) => p.module === module && p.action === action)).filter(Boolean);
    if (!grants.length) return <Typography.Text type="secondary">No access</Typography.Text>;
    return (
      <Space size={[4, 4]} wrap>
        {grants.map((g) => (
          <Tag key={g.action} color={g.scope === 'all' ? 'blue' : 'default'} style={{ margin: 0 }}>
            {g.action}
            {g.scope === 'own' ? ' (own)' : ''}
          </Tag>
        ))}
      </Space>
    );
  };

  const columns = [
    { title: 'Module', dataIndex: 'label', width: 200, fixed: 'left' },
    ...roles.map((role) => ({
      title: ROLE_LABELS[role.name] ?? role.name,
      render: (_, row) => cell(role, row.key),
    })),
  ];

  return (
    <>
      <Typography.Paragraph type="secondary">
        <Tag color="blue">all</Tag> means any record. <Tag>(own)</Tag> means only records assigned to or created by the person.
        Roles are fixed in this version; to change what a role can do, update the permission matrix in the database.
      </Typography.Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Table rowKey="key" size="small" loading={loading} columns={columns} dataSource={MODULES} pagination={false} scroll={{ x: 760 }} />
    </>
  );
}
