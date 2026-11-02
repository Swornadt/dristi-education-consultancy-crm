import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Popconfirm, Result, Row, Select, Space, Spin, Typography, message } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { assignLead, convertLead, deleteLead, getLead, listActivities, updateLeadStatus } from '../../api/leads';
import { useAuth } from '../../auth/AuthContext';
import Can from '../../components/Can';
import LeadStatusTag from '../../components/LeadStatusTag';
import { LEAD_SOURCES, LEAD_STATUSES, TEST_STATUSES, labelOf } from '../../config/leadOptions';
import { formatDate, formatDateTime, formatIntake } from '../../utils/format';
import LeadTasksCard from '../tasks/LeadTasksCard';
import ActivityPanel from './ActivityPanel';
import LeadFormModal from './LeadFormModal';
import LostReasonModal from './LostReasonModal';
import useLeadLookups from './useLeadLookups';

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const { countries, counselors } = useLeadLookups();

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [leadData, activityData] = await Promise.all([getLead(id), listActivities(id)]);
      setLead(leadData);
      setActivities(activityData);
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

  // Runs an action, shows the result, and refreshes the page data.
  const run = async (action, successText) => {
    setBusy(true);
    try {
      await action();
      messageApi.success(successText);
      await load();
      return true;
    } catch (err) {
      messageApi.error(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const refreshActivities = async () => setActivities(await listActivities(id));

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
        title="Lead not found"
        subTitle="It may have been deleted, or it isn't assigned to you."
        extra={<Button onClick={() => navigate('/leads')}>Back to leads</Button>}
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

  const canUpdate = can('leads', 'update');
  const isConverted = lead.status === 'converted';
  const canConvert = canUpdate && can('students', 'create') && !isConverted && lead.status !== 'lost';

  const details = [
    { key: 'phone', label: 'Phone', children: lead.phone ?? '-' },
    { key: 'email', label: 'Email', children: lead.email ?? '-' },
    { key: 'source', label: 'Source', children: labelOf(LEAD_SOURCES, lead.source) },
    { key: 'destination', label: 'Destination', children: lead.destinationCountry?.name ?? '-' },
    { key: 'intake', label: 'Desired intake', children: formatIntake(lead.desiredIntake) },
    { key: 'test', label: 'English test', children: labelOf(TEST_STATUSES, lead.testStatus) },
    { key: 'assigned', label: 'Assigned to', children: lead.assignedTo?.fullName ?? 'Unassigned' },
    { key: 'createdBy', label: 'Added by', children: lead.createdBy?.fullName ?? '-' },
    { key: 'created', label: 'Added on', children: formatDateTime(lead.createdAt) },
  ];
  if (lead.status === 'lost') details.push({ key: 'lost', label: 'Lost reason', children: lead.lostReason });
  if (isConverted) {
    details.push({
      key: 'converted',
      label: 'Converted',
      children: (
        <span>
          {formatDate(lead.convertedAt)}{' '}
          <Link to={`/students/${lead.studentId}`}>View student</Link>
        </span>
      ),
    });
  }
  details.push({ key: 'notes', label: 'Notes', children: lead.notes ?? '-' });

  return (
    <>
      {contextHolder}
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/leads')} style={{ paddingLeft: 0 }}>
        All leads
      </Button>

      <Space style={{ width: '100%', justifyContent: 'space-between', margin: '4px 0 16px' }} align="start" wrap>
        <Space align="center" size={12} wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {lead.fullName}
          </Typography.Title>
          <LeadStatusTag status={lead.status} />
        </Space>

        <Space wrap>
          {canUpdate && !isConverted && (
            <Select
              style={{ width: 200 }}
              value={lead.status}
              disabled={busy}
              options={LEAD_STATUSES.filter((s) => s.value !== 'converted')}
              onChange={(status) => {
                if (status === 'lost') setLostOpen(true);
                else run(() => updateLeadStatus(lead.id, { status }), 'Status updated');
              }}
            />
          )}
          {canUpdate && (
            <Select
              style={{ width: 190 }}
              value={lead.assignedTo?.id}
              disabled={busy}
              placeholder="Unassigned"
              suffixIcon={<UserSwitchOutlined />}
              options={counselors.map((c) => ({ value: c.id, label: c.fullName }))}
              onChange={(assignedTo) => run(() => assignLead(lead.id, assignedTo), 'Lead reassigned')}
            />
          )}
          <Can module="leads" action="update">
            <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </Can>
          {canConvert && (
            <Popconfirm
              title="Convert to student?"
              description="This creates a student profile and a document checklist."
              okText="Convert"
              onConfirm={() => run(() => convertLead(lead.id), 'Student profile created')}
            >
              <Button type="primary" loading={busy}>
                Convert to student
              </Button>
            </Popconfirm>
          )}
          <Can module="leads" action="delete">
            <Popconfirm
              title="Delete this lead?"
              description="Its activity history is deleted too. This can't be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await deleteLead(lead.id);
                  navigate('/leads');
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
        <Col xs={24} lg={10}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card title="Details">
              <Descriptions column={1} size="small" items={details} />
            </Card>
            <Can module="tasks" action="view">
              <LeadTasksCard lead={lead} counselors={counselors} />
            </Can>
          </Space>
        </Col>
        <Col xs={24} lg={14}>
          <ActivityPanel leadId={lead.id} activities={activities} canAdd={canUpdate} onAdded={refreshActivities} />
        </Col>
      </Row>

      <LeadFormModal
        open={editOpen}
        lead={lead}
        countries={countries}
        counselors={counselors}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          messageApi.success('Lead updated');
          load();
        }}
      />
      <LostReasonModal
        open={lostOpen}
        onCancel={() => setLostOpen(false)}
        onSubmit={async (reason) => {
          const ok = await run(() => updateLeadStatus(lead.id, { status: 'lost', lostReason: reason }), 'Lead marked as lost');
          if (ok) setLostOpen(false);
        }}
      />
    </>
  );
}
