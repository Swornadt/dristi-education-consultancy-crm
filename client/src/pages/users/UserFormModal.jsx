import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Typography } from 'antd';
import { createUser, updateUser } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../theme';
import { MIN_PASSWORD_LENGTH, generatePassword } from '../../utils/password';

// Add (no `record`) or edit (with `record`) a user. Email can't be changed after creation.
export default function UserFormModal({ open, record, roles, onClose, onSaved }) {
  const { user: me } = useAuth();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(record);
  const isSelf = record?.id === me.id;

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const roleOptions = roles.map((r) => ({ value: r.id, label: ROLE_LABELS[r.name] ?? r.name }));
  const initialValues = record
    ? { fullName: record.fullName, roleId: roles.find((r) => r.name === record.role)?.id }
    : undefined;

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        const payload = { fullName: values.fullName.trim() };
        if (!isSelf) payload.roleId = values.roleId;
        await updateUser(record.id, payload);
      } else {
        await createUser({ fullName: values.fullName.trim(), email: values.email.trim(), roleId: values.roleId, password: values.password });
      }
      onSaved();
    } catch (err) {
      if (err.details?.length) form.setFields(err.details.map((d) => ({ name: d.field, errors: [d.message] })));
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit user' : 'Add user'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Save changes' : 'Add user'}
      confirmLoading={saving}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={initialValues} requiredMark={false}>
        <Form.Item name="fullName" label="Full name" rules={[{ required: true, whitespace: true, message: 'Enter a name.' }]}>
          <Input autoFocus />
        </Form.Item>

        {isEdit ? (
          <Form.Item label="Email">
            <Typography.Text>{record.email}</Typography.Text>
          </Form.Item>
        ) : (
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: 'Enter an email address.' }, { type: 'email', message: 'Enter a valid email address.' }]}
          >
            <Input autoComplete="off" />
          </Form.Item>
        )}

        <Form.Item
          name="roleId"
          label="Role"
          rules={[{ required: true, message: 'Choose a role.' }]}
          extra={isSelf ? "You can't change your own role." : undefined}
        >
          <Select options={roleOptions} disabled={isSelf} placeholder="Select a role" />
        </Form.Item>

        {!isEdit && (
          <Form.Item
            name="password"
            label="Temporary password"
            extra="Share this with the user. They can change it after signing in."
            rules={[
              { required: true, message: 'Enter a password or generate one.' },
              { min: MIN_PASSWORD_LENGTH, message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` },
            ]}
          >
            <Input
              autoComplete="new-password"
              addonAfter={<Button type="link" size="small" onClick={() => form.setFieldValue('password', generatePassword())}>Generate</Button>}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
