import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Result, Row, Select, Space, Spin, Tabs, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getStudent, updateStudent } from '../../api/students';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../utils/format';
import useLeadLookups from '../leads/useLeadLookups';
import DocumentChecklist from './DocumentChecklist';
import EducationPanel from './EducationPanel';
import StudentFormModal from './StudentFormModal';
import TestScoresPanel from './TestScoresPanel';

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const { countries, counselors } = useLeadLookups();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setStudent(await getStudent(id));
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
        title="Student not found"
        subTitle="The profile may not exist, or it isn't assigned to you."
        extra={<Button onClick={() => navigate('/students')}>Back to students</Button>}
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

  const canUpdate = can('students', 'update');

  const reassign = async (assignedTo) => {
    setBusy(true);
    try {
      await updateStudent(student.id, { assignedTo });
      messageApi.success('Student reassigned');
      await load();
    } catch (err) {
      messageApi.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const details = [
    { key: 'phone', label: 'Phone', children: student.phone ?? '-' },
    { key: 'email', label: 'Email', children: student.email ?? '-' },
    { key: 'dob', label: 'Date of birth', children: formatDate(student.dateOfBirth) },
    { key: 'gender', label: 'Gender', children: student.gender ?? '-' },
    { key: 'nationality', label: 'Nationality', children: student.nationality ?? '-' },
    { key: 'address', label: 'Address', children: student.address ?? '-' },
    { key: 'guardian', label: 'Guardian', children: student.guardianName ?? '-' },
    { key: 'guardianPhone', label: 'Guardian phone', children: student.guardianPhone ?? '-' },
    {
      key: 'countries',
      label: 'Preferred countries',
      children: student.preferredCountries.length ? (
        <Space size={[4, 4]} wrap>
          {student.preferredCountries.map((c) => (
            <Tag key={c.id}>{c.name}</Tag>
          ))}
        </Space>
      ) : (
        '-'
      ),
    },
    { key: 'courses', label: 'Preferred courses', children: student.preferredCourses ?? '-' },
    { key: 'counselor', label: 'Counselor', children: student.assignedTo?.fullName ?? 'Unassigned' },
    { key: 'added', label: 'Student since', children: formatDate(student.createdAt) },
    { key: 'notes', label: 'Notes', children: student.notes ?? '-' },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Card
          title="Personal details"
          extra={
            canUpdate && (
              <Button size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )
          }
        >
          <Descriptions column={{ xs: 1, md: 2 }} size="small" items={details} />
        </Card>
      ),
    },
    {
      key: 'academics',
      label: 'Education and tests',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <EducationPanel student={student} onChanged={load} />
          </Col>
          <Col xs={24} xl={10}>
            <TestScoresPanel student={student} onChanged={load} />
          </Col>
        </Row>
      ),
    },
    ...(can('documents', 'view')
      ? [{ key: 'documents', label: 'Documents', children: <DocumentChecklist studentId={student.id} /> }]
      : []),
  ];

  return (
    <>
      {contextHolder}
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')} style={{ paddingLeft: 0 }}>
        All students
      </Button>

      <Space style={{ width: '100%', justifyContent: 'space-between', margin: '4px 0 16px' }} align="start" wrap>
        <Space align="center" size={12} wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {student.fullName}
          </Typography.Title>
          {can('leads', 'view') && student.leadId && <Link to={`/leads/${student.leadId}`}>View original lead</Link>}
        </Space>

        {canUpdate && (
          <Select
            style={{ width: 200 }}
            value={student.assignedTo?.id}
            disabled={busy}
            placeholder="Unassigned"
            suffixIcon={<UserSwitchOutlined />}
            options={counselors.map((c) => ({ value: c.id, label: c.fullName }))}
            onChange={reassign}
          />
        )}
      </Space>

      <Tabs items={tabItems} />

      <StudentFormModal
        open={editOpen}
        student={student}
        countries={countries}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          messageApi.success('Student updated');
          load();
        }}
      />
    </>
  );
}
