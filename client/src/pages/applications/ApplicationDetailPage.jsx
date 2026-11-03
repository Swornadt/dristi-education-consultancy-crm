import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Descriptions, Form, Input, Modal, Popconfirm, Result, Row, Space, Spin, Timeline, Typography, message } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteApplication, getApplication, updateApplication, updateApplicationStatus } from '../../api/applications';
import { useAuth } from '../../auth/AuthContext';
import ApplicationStatusTag from '../../components/ApplicationStatusTag';
import Can from '../../components/Can';
import DeadlineText from '../../components/DeadlineText';
import { APPLICATION_STATUSES, PROGRAM_LEVELS, STATUS_ACTIONS, STATUS_TRANSITIONS } from '../../config/applicationOptions';
import { labelOf } from '../../config/leadOptions';
import { formatDateTime, formatIntake } from '../../utils/format';
import StatusChangeModal from './StatusChangeModal';

const DOT_COLORS = { draft: 'gray', submitted: 'blue', offer: 'purple', accepted: 'green', rejected: 'red' };

function EditApplicationModal({ open, application, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleOk = async () => {
    const values = form.getFieldsValue();
    setSaving(true);
    setError(null);
    try {
      await updateApplication(application.id, {
        deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : null,
        notes: values.notes?.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit application" open={open} onCancel={onClose} onOk={handleOk} okText="Save changes" confirmLoading={saving} destroyOnClose>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form
        form={form}
        layout="vertical"
        initialValues={{ deadline: application.deadline ? dayjs(application.deadline) : undefined, notes: application.notes ?? undefined }}
      >
        <Form.Item name="deadline" label="Deadline">
          <DatePicker style={{ width: '100%' }} format="D MMM YYYY" />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setApp(await getApplication(id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error?.status === 404) {
    return (
      <Result
        status="404"
        title="Application not found"
        subTitle="It may have been deleted, or it isn't assigned to you."
        extra={<Button onClick={() => navigate('/applications')}>Back to applications</Button>}
      />
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message={error.message}
        action={
          <Button size="small" onClick={load}>
            Try again
          </Button>
        }
      />
    );
  }

  const canUpdate = can('applications', 'update');
  const nextOptions = STATUS_TRANSITIONS[app.status] ?? [];

  const details = [
    {
      key: 'student',
      label: 'Student',
      children: app.student ? <Link to={`/students/${app.student.id}`}>{app.student.fullName}</Link> : '-',
    },
    { key: 'counselor', label: 'Counselor', children: app.assignedTo?.fullName ?? '-' },
    { key: 'country', label: 'Country', children: app.country?.name ?? '-' },
    { key: 'university', label: 'University', children: app.university?.name ?? '-' },
    { key: 'program', label: 'Program', children: app.program ? `${app.program.name} (${labelOf(PROGRAM_LEVELS, app.program.level)})` : '-' },
    { key: 'intake', label: 'Intake', children: formatIntake(app.intake) },
    { key: 'deadline', label: 'Deadline', children: <DeadlineText deadline={app.deadline} status={app.status} /> },
    { key: 'submitted', label: 'Submitted', children: formatDateTime(app.submittedAt) },
    { key: 'notes', label: 'Notes', children: app.notes ?? '-' },
  ];

  const historyItems = [...(app.history ?? [])]
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    .map((h, i) => ({
      key: i,
      color: DOT_COLORS[h.toStatus] ?? 'gray',
      children: (
        <div>
          <Typography.Text strong>
            {h.fromStatus ? `${labelOf(APPLICATION_STATUSES, h.fromStatus)} → ` : 'Created as '}
            {labelOf(APPLICATION_STATUSES, h.toStatus)}
          </Typography.Text>
          <div>
            <Typography.Text type="secondary">
              {h.changedBy} · {formatDateTime(h.changedAt)}
            </Typography.Text>
          </div>
          {h.note && <div style={{ whiteSpace: 'pre-wrap' }}>{h.note}</div>}
        </div>
      ),
    }));

  return (
    <>
      {contextHolder}
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/applications')} style={{ paddingLeft: 0 }}>
        All applications
      </Button>

      <Space style={{ width: '100%', justifyContent: 'space-between', margin: '4px 0 16px' }} align="start" wrap>
        <Space align="center" size={12} wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {app.student?.fullName}: {app.program?.name}
          </Typography.Title>
          <ApplicationStatusTag status={app.status} />
        </Space>

        <Space wrap>
          {canUpdate &&
            nextOptions.map((status) => (
              <Button key={status} type={status === 'rejected' ? 'default' : 'primary'} danger={status === 'rejected'} onClick={() => setNextStatus(status)}>
                {STATUS_ACTIONS[status]}
              </Button>
            ))}
          {canUpdate && (
            <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
          <Can module="applications" action="delete">
            <Popconfirm
              title="Delete this application?"
              description="Its history is deleted too. This can't be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await deleteApplication(app.id);
                  navigate('/applications');
                } catch (err) {
                  messageApi.error(err.message);
                }
              }}
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Can>
        </Space>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Details">
            <Descriptions column={1} size="small" items={details} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="History">
            <Timeline items={historyItems} />
          </Card>
        </Col>
      </Row>

      <EditApplicationModal
        open={editOpen}
        application={app}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          messageApi.success('Application updated');
          load();
        }}
      />
      <StatusChangeModal
        open={Boolean(nextStatus)}
        status={nextStatus}
        onCancel={() => setNextStatus(null)}
        onSubmit={async (note) => {
          try {
            await updateApplicationStatus(app.id, { status: nextStatus, note });
            messageApi.success('Status updated');
            setNextStatus(null);
            await load();
          } catch (err) {
            messageApi.error(err.message);
          }
        }}
      />
    </>
  );
}
