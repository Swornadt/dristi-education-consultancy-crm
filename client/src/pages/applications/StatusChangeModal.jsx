import { useState } from 'react';
import { Form, Input, Modal } from 'antd';
import { APPLICATION_STATUSES } from '../../config/applicationOptions';

// Confirms moving an application to `status`, with an optional note for the history.
// onSubmit(note) should return a promise.
export default function StatusChangeModal({ open, status, onCancel, onSubmit }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const label = APPLICATION_STATUSES.find((s) => s.value === status)?.label ?? status;

  const handleOk = async () => {
    const { note } = form.getFieldsValue();
    setSaving(true);
    try {
      await onSubmit(note?.trim() || undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Move to "${label}"`}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Confirm"
      okButtonProps={{ danger: status === 'rejected' }}
      confirmLoading={saving}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="note" label="Note (optional)">
          <Input.TextArea rows={3} autoFocus placeholder="For example: offer letter received by email" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
