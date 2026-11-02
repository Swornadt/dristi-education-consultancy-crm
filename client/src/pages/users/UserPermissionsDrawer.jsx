import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Popconfirm, Space, Select, Spin, Table, Tag, Typography, message } from 'antd';
import { getUserPermissions, setUserPermissions } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_LABELS, PERMISSION_ACTIONS, PERMISSION_MODULES } from '../../config/permissionModules';
import { ROLE_LABELS } from '../../theme';
import { computeEffective, scopeIn } from '../../utils/permissions';

const keyOf = (module, action) => `${module}:${action}`;
const SCOPE_LABEL = { none: 'No access', own: 'Own', all: 'All' };

// Draft value per cell: 'inherit' | 'deny' | 'grant' (unscoped modules) | 'grant_own' | 'grant_all'
const draftFromOverrides = (overrides) =>
  Object.fromEntries(
    overrides.map((o) => {
      const module = PERMISSION_MODULES.find((m) => m.key === o.module);
      const value = o.effect === 'deny' ? 'deny' : module?.scoped ? (o.scope === 'own' ? 'grant_own' : 'grant_all') : 'grant';
      return [keyOf(o.module, o.action), value];
    })
  );

const overridesFromDraft = (draft) =>
  Object.entries(draft)
    .filter(([, value]) => value !== 'inherit')
    .map(([key, value]) => {
      const [module, action] = key.split(':');
      if (value === 'deny') return { module, action, effect: 'deny' };
      return { module, action, effect: 'grant', scope: value === 'grant_own' ? 'own' : 'all' };
    });

// Per-person permissions: start from the role, then grant extra access or deny some, one cell at a time.
export default function UserPermissionsDrawer({ open, user, onClose, onSaved }) {
  const { user: me } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !user) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    getUserPermissions(user.id)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setDraft(draftFromOverrides(res.overrides));
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
  }, [open, user]);

  const isAdminRole = data?.role.name === 'admin';
  const isSelf = user?.id === me.id;
  const readOnly = isAdminRole || isSelf;

  const overrides = overridesFromDraft(draft);
  const effective = data ? computeEffective(data.base, overrides) : [];
  const original = data ? draftFromOverrides(data.overrides) : {};
  const dirty = JSON.stringify(Object.entries(draft).filter(([, v]) => v !== 'inherit').sort()) !== JSON.stringify(Object.entries(original).sort());

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await setUserPermissions(user.id, overrides);
      messageApi.success('Permissions saved');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const optionsFor = (module, action) => {
    const base = scopeIn(data.base, module.key, action);
    const inherit = { value: 'inherit', label: `Role default (${SCOPE_LABEL[base].toLowerCase()})` };
    const grants = module.scoped
      ? [{ value: 'grant_own', label: 'Grant: own' }, { value: 'grant_all', label: 'Grant: all' }]
      : [{ value: 'grant', label: 'Grant' }];
    return [inherit, ...grants, ...(base !== 'none' ? [{ value: 'deny', label: 'Deny' }] : [])];
  };

  const cell = (module, action) => {
    if (!module.actions.includes(action)) return <Typography.Text type="secondary">-</Typography.Text>;
    const key = keyOf(module.key, action);
    const value = draft[key] ?? 'inherit';
    const eff = scopeIn(effective, module.key, action);
    const color = value === 'deny' ? 'red' : value.startsWith('grant') ? 'blue' : 'default';
    return (
      <Space direction="vertical" size={2}>
        <Tag color={color} style={{ margin: 0 }}>
          {SCOPE_LABEL[eff]}
        </Tag>
        <Select
          size="small"
          style={{ width: 170 }}
          value={value}
          options={optionsFor(module, action)}
          disabled={readOnly || saving}
          onChange={(v) => setDraft((prev) => ({ ...prev, [key]: v }))}
        />
      </Space>
    );
  };

  const columns = [
    { title: 'Module', dataIndex: 'label', width: 200, fixed: 'left' },
    ...PERMISSION_ACTIONS.map((action) => ({ title: ACTION_LABELS[action], width: 190, render: (_, module) => cell(module, action) })),
  ];

  return (
    <Drawer
      title={user ? `Permissions for ${user.fullName}` : 'Permissions'}
      open={open}
      onClose={onClose}
      width={Math.min(1040, typeof window === 'undefined' ? 1040 : window.innerWidth)}
      destroyOnClose
      extra={
        !readOnly && data && (
          <Space>
            <Popconfirm title="Remove all of this person's overrides?" okText="Reset" onConfirm={() => setDraft({})}>
              <Button disabled={saving || !Object.keys(draft).length}>Reset to role defaults</Button>
            </Popconfirm>
            <Button type="primary" disabled={!dirty} loading={saving} onClick={save}>
              Save
            </Button>
          </Space>
        )
      }
    >
      {contextHolder}
      {loading && (
        <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}>
          <Spin />
        </div>
      )}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      {data && (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text>
            Role: <Tag color="blue">{ROLE_LABELS[data.role.name] ?? data.role.name}</Tag>
            The role's permissions are the starting point. Grant extra access or deny some for this person only.
          </Typography.Text>
          {isAdminRole && <Alert type="info" showIcon message="Admins have full access, so their permissions can't be customized." />}
          {isSelf && !isAdminRole && <Alert type="info" showIcon message="You can't change your own permissions." />}
          {!readOnly && (
            <Alert
              type="info"
              showIcon
              message="The tag shows what the person will end up with. The person gets changes the next time they sign in or refresh. An action also needs view access to the same module."
            />
          )}
          {!isAdminRole && <Table rowKey="key" size="small" columns={columns} dataSource={PERMISSION_MODULES} pagination={false} scroll={{ x: 900 }} />}
        </Space>
      )}
    </Drawer>
  );
}
