import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Table, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { listApplications } from '../../api/applications';
import ApplicationStatusTag from '../../components/ApplicationStatusTag';
import Can from '../../components/Can';
import DeadlineText from '../../components/DeadlineText';
import { formatIntake } from '../../utils/format';
import ApplicationFormModal from '../applications/ApplicationFormModal';

// The applications of one student, shown as a tab on the student profile.
export default function StudentApplications({ student }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listApplications({ studentId: student.id, limit: 100, sort: 'deadline' });
      setRows(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [student.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const columns = [
    {
      title: 'Program',
      render: (_, app) => (
        <div>
          <Link to={`/applications/${app.id}`}>{app.program?.name}</Link>
          <div>
            <Typography.Text type="secondary">
              {app.university?.name}, {app.country?.name}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    { title: 'Intake', render: (_, app) => formatIntake(app.intake) },
    { title: 'Deadline', render: (_, app) => <DeadlineText deadline={app.deadline} status={app.status} /> },
    { title: 'Status', dataIndex: 'status', render: (s) => <ApplicationStatusTag status={s} /> },
  ];

  return (
    <Card
      title="Applications"
      extra={
        <Can module="applications" action="create">
          <Button size="small" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            New application
          </Button>
        </Can>
      }
    >
      {contextHolder}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        scroll={{ x: 600 }}
        locale={{ emptyText: 'No applications yet. Start one once the student has chosen a program.' }}
      />
      <ApplicationFormModal
        open={formOpen}
        student={student}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          messageApi.success('Application created');
          load();
        }}
      />
    </Card>
  );
}
