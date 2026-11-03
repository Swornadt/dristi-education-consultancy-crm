import { useState } from 'react';
import { Alert, Button, Card, Empty, Form, Input, Select, Space, Tag, Timeline, Typography } from 'antd';
import { addActivity } from '../../api/leads';
import { ACTIVITY_TYPES, labelOf } from '../../config/leadOptions';
import { formatDateTime } from '../../utils/format';

const TYPE_LABELS = [...ACTIVITY_TYPES, { value: 'status_change', label: 'Update' }];

export default function ActivityPanel({ leadId, activities, canAdd, onAdded }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (values) => {
    setSaving(true);
    setError(null);
    try {
      await addActivity(leadId, { type: values.type, content: values.content.trim() });
      form.resetFields();
      await onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const items = activities.map((a) => ({
    key: a.id,
    color: a.type === 'status_change' ? 'gray' : 'blue',
    children: (
      <div>
        <Space size={8} wrap>
          <Tag>{labelOf(TYPE_LABELS, a.type)}</Tag>
          <Typography.Text type="secondary">{formatDateTime(a.occurredAt)}</Typography.Text>
        </Space>
        <div style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>{a.content}</div>
        <Typography.Text type="secondary">{a.createdBy?.fullName}</Typography.Text>
      </div>
    ),
  }));

  return (
    <Card title="Activity">
      {canAdd && (
        <Form form={form} layout="vertical" onFinish={submit} initialValues={{ type: 'note' }} requiredMark={false}>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
          <Form.Item name="type" label="Type" style={{ maxWidth: 200 }}>
            <Select options={ACTIVITY_TYPES} />
          </Form.Item>
          <Form.Item name="content" rules={[{ required: true, whitespace: true, message: 'Write something first.' }]}>
            <Input.TextArea rows={3} placeholder="What happened? Add a call summary, a note, or meeting outcome." />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            Add activity
          </Button>
        </Form>
      )}

      <div style={{ marginTop: canAdd ? 24 : 0 }}>
        {items.length ? (
          <Timeline items={items} />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet. Log the first call or note." />
        )}
      </div>
    </Card>
  );
}
