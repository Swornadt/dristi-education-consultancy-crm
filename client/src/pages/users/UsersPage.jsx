import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd';
import { EditOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons';
import { listRoles, listUsers, updateUser } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../theme';
import { formatDate, formatDateTime } from '../../utils/format';
import PermissionMatrix from './PermissionMatrix';
import ResetPasswordModal from './ResetPasswordModal';
import UserFormModal from './UserFormModal';

const DEFAULT_QUERY = { page: 1, limit: 20 };

function UsersTab() {
  const { user: me } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [searchText, setSearchText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState({ data: [], meta: { total: 0 } });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ open: false, record: null });
  const [reset, setReset] = useState({ open: false, record: null });

  const hasFilters = Boolean(query.q || query.role || query.isActive !== undefined);
  const reload = () => setRefreshKey((k) => k + 1);
  const setFilter = (patch) => setQuery((prev) => ({ ...prev, ...patch, page: 1 }));

  useEffect(() => {
    let cancelled = false;
    listRoles()
      .then((rows) => {
        if (!cancelled) setRoles(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listUsers(query)
      .then((res) => {
        if (!cancelled) setResult(res);
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
  }, [query, refreshKey]);

  const toggleActive = async (record, isActive) => {
    try {
      await updateUser(record.id, { isActive });
      messageApi.success(isActive ? `${record.fullName} can sign in again` : `${record.fullName} can no longer sign in`);
      reload();
    } catch (err) {
      messageApi.error(err.message);
    }
  };

  const columns = [
    {
      title: 'Name',
      render: (_, u) => (
        <div>
          <Typography.Text strong>{u.fullName}</Typography.Text>
          {u.id === me.id && (
            <Tag style={{ marginLeft: 8 }} bordered={false}>
              You
            </Tag>
          )}
          <div>
            <Typography.Text type="secondary">{u.email}</Typography.Text>
          </div>
        </div>
      ),
    },
    { title: 'Role', dataIndex: 'role', render: (r) => <Tag color="blue">{ROLE_LABELS[r] ?? r}</Tag> },
    {
      title: 'Active',
      width: 90,
      render: (_, u) => <Switch size="small" checked={u.isActive} disabled={u.id === me.id} onChange={(value) => toggleActive(u, value)} />,
    },
    { title: 'Last sign-in', dataIndex: 'lastLoginAt', render: (v) => (v ? formatDateTime(v) : 'Never') },
    { title: 'Added', dataIndex: 'createdAt', render: formatDate },
    {
      title: '',
      width: 96,
      render: (_, u) => (
        <Space size={4}>
          <Button type="text" icon={<EditOutlined />} aria-label="Edit user" onClick={() => setForm({ open: true, record: u })} />
          <Button type="text" icon={<KeyOutlined />} aria-label="Reset password" onClick={() => setReset({ open: true, record: u })} />
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="start" wrap>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search name or email"
            style={{ width: 240 }}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              if (!e.target.value && query.q) setFilter({ q: undefined });
            }}
            onSearch={(value) => setFilter({ q: value.trim() || undefined })}
          />
          <Select
            allowClear
            placeholder="Role"
            style={{ width: 150 }}
            value={query.role}
            options={roles.map((r) => ({ value: r.name, label: ROLE_LABELS[r.name] ?? r.name }))}
            onChange={(value) => setFilter({ role: value })}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 130 }}
            value={query.isActive}
            options={[
              { value: true, label: 'Active' },
              { value: false, label: 'Inactive' },
            ]}
            onChange={(value) => setFilter({ isActive: value })}
          />
          {hasFilters && (
            <Button
              onClick={() => {
                setSearchText('');
                setQuery(DEFAULT_QUERY);
              }}
            >
              Clear filters
            </Button>
          )}
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setForm({ open: true, record: null })}>
          Add user
        </Button>
      </Space>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={result.data}
        loading={loading}
        scroll={{ x: 760 }}
        onChange={(pagination) => setQuery((prev) => ({ ...prev, page: pagination.current, limit: pagination.pageSize }))}
        pagination={{
          current: query.page,
          pageSize: query.limit,
          total: result.meta.total,
          showSizeChanger: true,
          showTotal: (total) => `${total} users`,
        }}
        locale={{ emptyText: hasFilters ? 'No users match these filters.' : 'No users yet.' }}
      />

      <UserFormModal
        open={form.open}
        record={form.record}
        roles={roles}
        onClose={() => setForm({ open: false, record: null })}
        onSaved={() => {
          messageApi.success(form.record ? 'User updated' : 'User added');
          setForm({ open: false, record: null });
          reload();
        }}
      />
      <ResetPasswordModal
        open={reset.open}
        record={reset.record}
        onClose={() => setReset({ open: false, record: null })}
        onSaved={() => {
          messageApi.success('Password reset');
          setReset({ open: false, record: null });
        }}
      />
    </>
  );
}

export default function UsersPage() {
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Users
      </Typography.Title>
      <Card>
        <Tabs
          items={[
            { key: 'users', label: 'Users', children: <UsersTab /> },
            { key: 'roles', label: 'Roles and permissions', children: <PermissionMatrix /> },
          ]}
        />
      </Card>
    </>
  );
}
