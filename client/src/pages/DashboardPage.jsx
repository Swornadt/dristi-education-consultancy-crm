import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Row, Space, Spin, Statistic, Table, Tag, Typography, theme } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { getDashboardSummary } from '../api/dashboard';
import { useAuth } from '../auth/AuthContext';
import ApplicationStatusTag from '../components/ApplicationStatusTag';
import BarList from '../components/BarList';
import LeadStatusTag from '../components/LeadStatusTag';
import { LEAD_SOURCES, labelOf } from '../config/leadOptions';
import { formatDate } from '../utils/format';

function DaysLeft({ deadline }) {
  const days = dayjs(deadline).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (days === 0) return <Tag color="red">Today</Tag>;
  return <Tag color={days <= 7 ? 'gold' : 'default'}>{days} days</Tag>;
}

export default function DashboardPage() {
  const { user, scopeOf } = useAuth();
  const { token } = theme.useToken();
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const seesAll = scopeOf('dashboard', 'view') === 'all';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDashboardSummary(month.format('YYYY-MM'))
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, refreshKey]);

  const header = (
    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="start" wrap>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Welcome, {user.fullName}
        </Typography.Title>
        <Typography.Text type="secondary">
          {seesAll ? 'Showing the whole consultancy.' : 'Showing your own leads, tasks and applications.'}
        </Typography.Text>
      </div>
      <Space>
        <DatePicker
          picker="month"
          allowClear={false}
          value={month}
          format="MMMM YYYY"
          disabledDate={(d) => d.isAfter(dayjs(), 'month')}
          onChange={(value) => value && setMonth(value.startOf('month'))}
        />
        <Button icon={<ReloadOutlined />} onClick={() => setRefreshKey((k) => k + 1)} aria-label="Refresh" />
      </Space>
    </Space>
  );

  if (error && !data) {
    return (
      <>
        {header}
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => setRefreshKey((k) => k + 1)}>
              Try again
            </Button>
          }
        />
      </>
    );
  }

  if (!data) {
    return (
      <>
        {header}
        <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      </>
    );
  }

  const monthLabel = month.format('MMM YYYY');

  const statCards = [
    { title: `New leads in ${monthLabel}`, value: data.newLeadsThisMonth, to: '/leads' },
    { title: `Conversions in ${monthLabel}`, value: data.conversionsThisMonth, to: '/students' },
    { title: 'Tasks due today', value: data.tasksDueToday, to: '/tasks?view=today' },
    { title: 'Overdue tasks', value: data.tasksOverdue, to: '/tasks?view=overdue', danger: data.tasksOverdue > 0 },
  ];

  const deadlineColumns = [
    {
      title: 'Student',
      render: (_, d) => <Link to={`/applications/${d.applicationId}`}>{d.studentName}</Link>,
    },
    {
      title: 'Program',
      render: (_, d) => (
        <div>
          {d.program}
          <div>
            <Typography.Text type="secondary">{d.university}</Typography.Text>
          </div>
        </div>
      ),
    },
    { title: 'Deadline', dataIndex: 'deadline', render: formatDate },
    { title: 'Due in', dataIndex: 'deadline', render: (deadline) => <DaysLeft deadline={deadline} /> },
  ];

  return (
    <>
      {header}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {statCards.map((card) => (
            <Col xs={24} sm={12} lg={6} key={card.title}>
              <Link to={card.to}>
                <Card hoverable>
                  <Statistic title={card.title} value={card.value} valueStyle={card.danger ? { color: token.colorError } : undefined} />
                </Card>
              </Link>
            </Col>
          ))}

          <Col xs={24} lg={8}>
            <Card title="Leads by status">
              <BarList
                items={data.leadsByStatus.map((s) => ({ key: s.status, label: <LeadStatusTag status={s.status} />, value: s.count }))}
                emptyText="No leads yet."
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Leads by source">
              <BarList
                items={data.leadsBySource.map((s) => ({ key: s.source, label: labelOf(LEAD_SOURCES, s.source), value: s.count }))}
                emptyText="No leads yet."
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Applications by status">
              <BarList
                items={data.applicationsByStatus.map((s) => ({ key: s.status, label: <ApplicationStatusTag status={s.status} />, value: s.count }))}
                emptyText="No applications yet."
              />
            </Card>
          </Col>

          <Col span={24}>
            <Card title="Application deadlines in the next 30 days" extra={<Link to="/applications">All applications</Link>}>
              <Table
                rowKey="applicationId"
                size="small"
                columns={deadlineColumns}
                dataSource={data.upcomingDeadlines}
                pagination={false}
                scroll={{ x: 560 }}
                locale={{ emptyText: 'No draft or submitted applications are due in the next 30 days.' }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </>
  );
}
