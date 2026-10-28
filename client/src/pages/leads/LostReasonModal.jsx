import { useState } from 'react';
import { Form, Input, Modal } from 'antd';

// Asks why a lead is lost. onSubmit(reason) should return a promise.
export default function LostReasonModal({ open, onCancel, onSubmit }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values.reason.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Mark lead as lost"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Mark as lost"
      okButtonProps={{ danger: true }}
      confirmLoading={saving}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="reason" label="Reason" rules={[{ required: true, whitespace: true, message: 'Enter a reason.' }]}>
          <Input.TextArea rows={3} autoFocus placeholder="For example: chose to study locally" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
