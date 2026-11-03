import { useEffect, useState } from 'react';
import { Alert, Button, Segmented, Select, Space, Switch, Table, Typography, message } from 'antd';
import { listRoles, updateRolePermissions } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_LABELS, PERMISSION_ACTIONS, PERMISSION_MODULES } from '../../config/permissionModules';
import { ROLE_LABELS } from '../../theme';
import { scopeIn } from '../../utils/permissions';

const keyOf = (module, action) => `${module}:${action}`;
const SCOPE_OPTIONS = [
  { value: 'none', label: 'No access' },
  { value: 'own', label: 'Own records' },
  { value: 'all', label: 'All records' },
];

// The role's permissions as a draft: { 'leads:view': 'none' | 'own' | 'all', ... }
const draftFrom = (role) =>
  Object.fromEntries(
    PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => [keyOf(m.key, a), scopeIn(role.permissions, m.key, a)]))
  );

// Edit what each role may do. Admin is locked: it always has full access.
export default function RolePermissionsEditor() {
  const { user: me } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const role = roles.find((r) => r.id === roleId);
  const isAdminRole = role?.name === 'admin';
  const canEdit = me.role === 'admin' && !isAdminRole;

  useEffect(() => {
    let cancelled = false;
    listRoles()
      .then((rows) => {
        if (cancelled) return;
        setRoles(rows);
        setRoleId((current) => current ?? rows.find((r) => r.name === 'counselor')?.id ?? rows[0]?.id ?? null);
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

  useEffect(() => {
    if (role) setDraft(draftFrom(role));
  }, [role]);

  const original = role ? draftFrom(role) : {};
  const dirty = Object.keys(draft).some((k) => draft[k] !== original[k]);

  const setCell = (module, action, value) => {
    setDraft((prev) => {
      const next = { ...prev, [keyOf(module.key, action)]: value };
      if (action === 'view' && value === 'none') {
        // No view means no other access to that module.
        module.actions.forEach((a) => {
          next[keyOf(module.key, a)] = 'none';
        });
      } else if (action !== 'view' && value !== 'none' && next[keyOf(module.key, 'view')] === 'none') {
        // Any action needs at least view.
        next[keyOf(module.key, 'view')] = module.scoped ? 'own' : 'all';
      }
      return next;
    });
  };

  const save = async () => {
    const permissions = Object.entries(draft)
      .filter(([, scope]) => scope !== 'none')
      .map(([key, scope]) => {
        const [module, action] = key.split(':');
        return { module, action, scope };
      });
    setSaving(true);
    setError(null);
    try {
      const updated = await updateRolePermissions(role.id, permissions);
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      messageApi.success(`${ROLE_LABELS[role.name] ?? role.name} permissions saved`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const cell = (module, action) => {
    if (!module.actions.includes(action)) return <Typography.Text type="secondary">-</Typography.Text>;
    const value = draft[keyOf(module.key, action)] ?? 'none';
    if (module.scoped) {
      return (
        <Select
          size="small"
          style={{ width: 130 }}
          value={value}
          options={SCOPE_OPTIONS}
          disabled={!canEdit || saving}
          onChange={(v) => setCell(module, action, v)}
        />
      );
    }
    return (
      <Switch
        size="small"
        checked={value !== 'none'}
        disabled={!canEdit || saving}
        onChange={(on) => setCell(module, action, on ? 'all' : 'none')}
      />
    );
  };

  const columns = [
    { title: 'Module', dataIndex: 'label', width: 210, fixed: 'left' },
    ...PERMISSION_ACTIONS.map((action) => ({
      title: ACTION_LABELS[action],
      width: 160,
      render: (_, module) => cell(module, action),
    })),
  ];

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Segmented
          value={roleId}
          onChange={setRoleId}
          options={roles.map((r) => ({ value: r.id, label: ROLE_LABELS[r.name] ?? r.name }))}
        />

        {isAdminRole ? (
          <Alert type="info" showIcon message="The admin role always has full access and can't be edited." />
        ) : (
          <Alert
            type="info"
            showIcon
            message="Changes apply to everyone with this role, except where a person has their own overrides (use the shield icon in the Users tab)."
            description="People get the new permissions the next time they sign in or refresh the page. 'Own records' means records assigned to or created by the person. Any create, edit or delete access also needs view access."
          />
        )}
        {me.role !== 'admin' && <Alert type="warning" showIcon message="Only admins can edit roles." />}
        {error && <Alert type="error" showIcon message={error} />}

        <Table
          rowKey="key"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={PERMISSION_MODULES}
          pagination={false}
          scroll={{ x: 860 }}
        />

        {canEdit && (
          <Space>
            <Button type="primary" disabled={!dirty} loading={saving} onClick={save}>
              Save changes
            </Button>
            <Button disabled={!dirty || saving} onClick={() => setDraft(original)}>
              Discard changes
            </Button>
          </Space>
        )}
      </Space>
    </>
  );
}
