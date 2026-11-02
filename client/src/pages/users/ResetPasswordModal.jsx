import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal } from 'antd';
import { updateUser } from '../../api/users';
import { MIN_PASSWORD_LENGTH, generatePassword } from '../../utils/password';

// Sets a new password for another user. The admin hands it over; the user can change it after signing in.
export default function ResetPasswordModal({ open, record, onClose, onSaved }) {
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
      await updateUser(record.id, { password: values.password });
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
      title={`Reset password for ${record?.fullName ?? ''}`}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Reset password"
      confirmLoading={saving}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="password"
          label="New password"
          extra="Share this with the user. Their old password stops working immediately."
          rules={[
            { required: true, message: 'Enter a password or generate one.' },
            { min: MIN_PASSWORD_LENGTH, message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` },
          ]}
        >
          <Input
            autoFocus
            autoComplete="new-password"
            addonAfter={<Button type="link" size="small" onClick={() => form.setFieldValue('password', generatePassword())}>Generate</Button>}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
