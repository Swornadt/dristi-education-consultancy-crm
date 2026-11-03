import { useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { addTestScore, deleteTestScore, updateTestScore } from '../../api/students';
import { useAuth } from '../../auth/AuthContext';
import { SECTIONS, SECTION_RANGES, SECTION_TESTS, TEST_NAMES, TEST_RANGES } from '../../config/studentOptions';
import { formatDate } from '../../utils/format';

function TestScoreModal({ open, studentId, record, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(record);
  const testName = Form.useWatch('testName', form) ?? record?.testName;
  const overall = TEST_RANGES[testName];
  const hasSections = SECTION_TESTS.includes(testName);
  const sectionRange = SECTION_RANGES[testName];

  const initialValues = record
    ? {
        testName: record.testName,
        overallScore: record.overallScore ?? undefined,
        testDate: record.testDate ? dayjs(record.testDate) : undefined,
        ...Object.fromEntries(SECTIONS.map((s) => [`section_${s.key}`, record.sectionScores?.[s.key] ?? undefined])),
      }
    : { testName: 'IELTS' };

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const sectionScores = hasSections
      ? Object.fromEntries(SECTIONS.map((s) => [s.key, values[`section_${s.key}`]]).filter(([, v]) => v != null))
      : null;
    const payload = {
      testName: values.testName,
      overallScore: values.overallScore ?? null,
      sectionScores: sectionScores && Object.keys(sectionScores).length ? sectionScores : null,
      testDate: values.testDate ? values.testDate.format('YYYY-MM-DD') : null,
    };
    setSaving(true);
    setError(null);
    try {
      if (isEdit) await updateTestScore(studentId, record.id, payload);
      else await addTestScore(studentId, payload);
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
      title={isEdit ? 'Edit test score' : 'Add test score'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Save changes' : 'Add'}
      confirmLoading={saving}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={initialValues} requiredMark={false}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="testName" label="Test" rules={[{ required: true, message: 'Choose a test.' }]}>
              <Select options={TEST_NAMES} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="overallScore" label="Overall score">
              <InputNumber {...overall} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        {hasSections && (
          <Row gutter={12}>
            {SECTIONS.map((s) => (
              <Col span={6} key={s.key}>
                <Form.Item name={`section_${s.key}`} label={s.label}>
                  <InputNumber {...sectionRange} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            ))}
          </Row>
        )}
        <Form.Item name="testDate" label="Test date">
          <DatePicker style={{ width: '100%' }} format="D MMM YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

const formatSections = (scores) =>
  scores
    ? SECTIONS.filter((s) => scores[s.key] != null)
        .map((s) => `${s.short} ${scores[s.key]}`)
        .join(' · ')
    : '-';

// Test scores for a student. `onChanged` should reload the student.
export default function TestScoresPanel({ student, onChanged }) {
  const { can } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const canUpdate = can('students', 'update');

  const remove = async (record) => {
    try {
      await deleteTestScore(student.id, record.id);
      messageApi.success('Removed');
      onChanged();
    } catch (err) {
      messageApi.error(err.message);
    }
  };

  const columns = [
    { title: 'Test', dataIndex: 'testName' },
    { title: 'Overall', dataIndex: 'overallScore', render: (v) => v ?? '-' },
    { title: 'Sections', dataIndex: 'sectionScores', render: formatSections },
    { title: 'Date', dataIndex: 'testDate', render: formatDate },
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
                  aria-label="Edit test score"
                  onClick={() => {
                    setEditing(record);
                    setModalOpen(true);
                  }}
                />
                <Popconfirm title="Remove this score?" okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => remove(record)}>
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove test score" />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      title="Test scores"
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
        dataSource={student.testScores}
        pagination={false}
        scroll={{ x: 520 }}
        locale={{ emptyText: 'No test scores yet.' }}
      />
      <TestScoreModal
        open={modalOpen}
        studentId={student.id}
        record={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          messageApi.success(editing ? 'Test score updated' : 'Test score added');
          onChanged();
        }}
      />
    </Card>
  );
}
