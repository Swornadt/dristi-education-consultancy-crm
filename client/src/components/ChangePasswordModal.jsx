import { useEffect, useState } from 'react';
import { Alert, Form, Input, Modal, message } from 'antd';
import { changePassword } from '../api/auth';
import { MIN_PASSWORD_LENGTH } from '../utils/password';

// Lets the signed-in person change their own password.
export default function ChangePasswordModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

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
      await changePassword(values.currentPassword, values.newPassword);
      message.success('Password changed');
      onClose();
    } catch (err) {
      if (err.details?.length) form.setFields(err.details.map((d) => ({ name: d.field, errors: [d.message] })));
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Change password" open={open} onCancel={onClose} onOk={handleOk} okText="Change password" confirmLoading={saving} destroyOnClose maskClosable={false}>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: 'Enter your current password.' }]}>
          <Input.Password autoComplete="current-password" autoFocus />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="New password"
          rules={[
            { required: true, message: 'Enter a new password.' },
            { min: MIN_PASSWORD_LENGTH, message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm new password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Confirm the new password.' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject(new Error("The passwords don't match.")),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
