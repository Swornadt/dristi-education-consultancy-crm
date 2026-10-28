import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';
import { useAuth } from '../auth/AuthContext';

// Placeholder numbers. Replace with GET /dashboard/summary in week 4.
const SAMPLE = [
  { title: 'New leads this month', value: 23 },
  { title: 'Conversions this month', value: 5 },
  { title: 'Tasks due today', value: 4 },
  { title: 'Overdue tasks', value: 2 },
];

export default function DashboardPage() {
  const { user, scopeOf } = useAuth();
  const scope = scopeOf('dashboard', 'view') === 'all' ? 'the whole consultancy' : 'your own leads and students';

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Welcome, {user.fullName}
      </Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`These are sample numbers. The real dashboard will show ${scope}.`}
      />
      <Row gutter={[16, 16]}>
        {SAMPLE.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card>
              <Statistic title={item.title} value={item.value} />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
