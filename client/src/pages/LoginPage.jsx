import { useState } from 'react';
import { Alert, Button, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { takeLoginNotice } from '../api/token';
import { MOCK_ACCOUNTS, MOCK_PASSWORD } from '../mocks/auth';
import { APP_NAME, ROLE_LABELS } from '../theme';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // e.g. "Your session has ended". Read once so it does not reappear on the next visit.
  const [notice] = useState(() => takeLoginNotice());

  // After a successful login `user` is set and we land back where the person was headed.
  const from = location.state?.from?.pathname || '/';
  if (user) return <Navigate to={from} replace />;

  const onFinish = async ({ email, password }) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Could not sign in. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-aside">
        <h1>{APP_NAME}</h1>
        <p>Follow every student from first inquiry to final enrollment, in one place.</p>
      </aside>
      <main className="login-main">
        <div className="login-card">
          <Typography.Title level={3} style={{ marginTop: 0 }}>
            Sign in
          </Typography.Title>

          {notice && !error && <Alert type="info" message={notice} showIcon style={{ marginBottom: 16 }} />}
          {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Enter your email.' },
                { type: 'email', message: 'Enter a valid email address.' },
              ]}
            >
              <Input prefix={<MailOutlined />} autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password.' }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Sign in
            </Button>
          </Form>

          {USE_MOCK && (
            <div className="login-hint">
              <Typography.Text type="secondary">Mock mode. Fill in an account (password: {MOCK_PASSWORD}):</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  {MOCK_ACCOUNTS.map((account) => (
                    <Button
                      key={account.role}
                      size="small"
                      onClick={() => form.setFieldsValue({ email: account.email, password: MOCK_PASSWORD })}
                    >
                      {ROLE_LABELS[account.role]}
                    </Button>
                  ))}
                </Space>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
