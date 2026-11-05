import { useState } from 'react';
import { Alert, Form, Input, Modal } from 'antd';
import { APPLICATION_STATUSES } from '../../config/applicationOptions';

// Confirms moving an application to `status`, with an optional note for the history.
// onSubmit(note) should return a promise.
export default function StatusChangeModal({ open, status, onCancel, onSubmit }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const label = APPLICATION_STATUSES.find((s) => s.value === status)?.label ?? status;

  const handleOk = async () => {
    const { note } = form.getFieldsValue();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(note?.trim() || undefined);
    } catch (err) {
      // Keep the modal open so the user can see what went wrong (e.g. a 409
      // invalid-transition error) and try again or cancel.
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Move to "${label}"`}
      open={open}
      onCancel={() => { setError(null); onCancel(); }}
      onOk={handleOk}
      okText="Confirm"
      okButtonProps={{ danger: status === 'rejected' }}
      confirmLoading={saving}
      destroyOnClose
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical">
        <Form.Item name="note" label="Note (optional)">
          <Input.TextArea rows={3} autoFocus placeholder="For example: offer letter received by email" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
