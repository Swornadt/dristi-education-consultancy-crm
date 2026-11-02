import { useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Table, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { addEducation, deleteEducation, updateEducation } from '../../api/students';
import { useAuth } from '../../auth/AuthContext';
import { EDUCATION_LEVELS } from '../../config/studentOptions';

const thisYear = new Date().getFullYear();

function EducationModal({ open, studentId, record, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(record);

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      level: values.level.trim(),
      institution: values.institution.trim(),
      fieldOfStudy: values.fieldOfStudy?.trim() || null,
      startYear: values.startYear ?? null,
      endYear: values.endYear ?? null,
      grade: values.grade?.trim() || null,
    };
    setSaving(true);
    setError(null);
    try {
      if (isEdit) await updateEducation(studentId, record.id, payload);
      else await addEducation(studentId, payload);
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
      title={isEdit ? 'Edit education' : 'Add education'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Save changes' : 'Add'}
      confirmLoading={saving}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={record ?? undefined} requiredMark={false}>
        <Form.Item name="level" label="Level" rules={[{ required: true, whitespace: true, message: 'Choose or type a level.' }]}>
          <AutoComplete options={EDUCATION_LEVELS} placeholder="For example: Bachelor" />
        </Form.Item>
        <Form.Item name="institution" label="Institution" rules={[{ required: true, whitespace: true, message: 'Enter the institution.' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="fieldOfStudy" label="Field of study">
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="startYear" label="Start year">
              <InputNumber min={1980} max={thisYear + 1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="endYear" label="End year" dependencies={['startYear']}>
              <InputNumber min={1980} max={thisYear + 8} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="grade" label="Grade">
              <Input placeholder="GPA or %" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

// Education history for a student. `onChanged` should reload the student.
export default function EducationPanel({ student, onChanged }) {
  const { can } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const canUpdate = can('students', 'update');

  const remove = async (record) => {
    try {
      await deleteEducation(student.id, record.id);
      messageApi.success('Removed');
      onChanged();
    } catch (err) {
      messageApi.error(err.message);
    }
  };

  const columns = [
    { title: 'Level', dataIndex: 'level' },
    { title: 'Institution', dataIndex: 'institution' },
    { title: 'Field', dataIndex: 'fieldOfStudy', render: (v) => v ?? '-' },
    {
      title: 'Years',
      render: (_, r) => (r.startYear || r.endYear ? `${r.startYear ?? '?'} - ${r.endYear ?? '?'}` : '-'),
    },
    { title: 'Grade', dataIndex: 'grade', render: (v) => v ?? '-' },
    ...(canUpdate
      ? [
          {
            title: '',
            width: 90,
            render: (_, record) => (
              <Space size={4}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  aria-label="Edit education"
                  onClick={() => {
                    setEditing(record);
                    setModalOpen(true);
                  }}
                />
                <Popconfirm title="Remove this entry?" okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => remove(record)}>
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove education" />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      title="Education"
      extra={
        canUpdate && (
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add
          </Button>
        )
      }
    >
      {contextHolder}
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={student.education}
        pagination={false}
        scroll={{ x: 600 }}
        locale={{ emptyText: 'No education history yet.' }}
      />
      <EducationModal
        open={modalOpen}
        studentId={student.id}
        record={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          messageApi.success(editing ? 'Education updated' : 'Education added');
          onChanged();
        }}
      />
    </Card>
  );
}
