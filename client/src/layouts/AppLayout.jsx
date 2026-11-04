import { useState } from 'react';
import { Alert, Dropdown, Layout, Menu, Space, Tag, Typography } from 'antd';
import { DownOutlined, KeyOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ErrorBoundary from '../components/ErrorBoundary';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { NAV_ITEMS } from '../config/modules';
import { APP_NAME, APP_SHORT_NAME, ROLE_LABELS } from '../theme';

const { Sider, Header, Content } = Layout;

export default function AppLayout() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const online = useOnlineStatus();

  // Only show modules the user is allowed to view.
  const menuItems = NAV_ITEMS.filter((item) => can(item.module, 'view')).map((item) => ({
    key: item.path,
    icon: item.icon,
    label: item.label,
  }));

  // "/leads/12" should still highlight "/leads".
  const selectedKey = `/${pathname.split('/')[1]}`;

  const userMenu = {
    items: [
      { key: 'password', icon: <KeyOutlined />, label: 'Change password', onClick: () => setPasswordOpen(true) },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', onClick: logout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={232}
        collapsedWidth={64}
        breakpoint="lg"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
      >
        <div className="brand">{collapsed ? APP_SHORT_NAME : APP_NAME}</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Tag color="blue">{ROLE_LABELS[user.role] ?? user.role}</Tag>
          <Dropdown menu={userMenu} trigger={['click']}>
            <Typography.Link style={{ color: 'inherit' }}>
              <Space>
                <UserOutlined />
                {user.fullName}
                <DownOutlined style={{ fontSize: 11 }} />
              </Space>
            </Typography.Link>
          </Dropdown>
        </Header>
        {!online && (
          <Alert banner type="warning" showIcon message="You're offline. Changes can't be saved until the connection is back." />
        )}
        <Content className="app-content">
          {/* Keyed by path so moving to another page clears a crashed one; the sidebar stays usable. */}
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </Content>
      </Layout>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Layout>
  );
}
