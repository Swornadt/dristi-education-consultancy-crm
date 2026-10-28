import {
  CheckSquareOutlined,
  DashboardOutlined,
  FileTextOutlined,
  GlobalOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserAddOutlined,
  WalletOutlined,
} from '@ant-design/icons';

// Single source of truth for the sidebar AND the routes.
// An item shows up only if the user has `module:view`.
export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', module: 'dashboard', icon: <DashboardOutlined />, plannedWeek: 4 },
  { key: 'leads', label: 'Leads', path: '/leads', module: 'leads', icon: <UserAddOutlined />, plannedWeek: 2 },
  { key: 'tasks', label: 'Tasks', path: '/tasks', module: 'tasks', icon: <CheckSquareOutlined />, plannedWeek: 2 },
  { key: 'students', label: 'Students', path: '/students', module: 'students', icon: <SolutionOutlined />, plannedWeek: 3 },
  { key: 'applications', label: 'Applications', path: '/applications', module: 'applications', icon: <FileTextOutlined />, plannedWeek: 3 },
  { key: 'catalog', label: 'Universities', path: '/catalog', module: 'catalog', icon: <GlobalOutlined />, plannedWeek: 3 },
  { key: 'accounts', label: 'Accounts', path: '/accounts', module: 'accounts', icon: <WalletOutlined />, plannedWeek: 4 },
  { key: 'users', label: 'Users', path: '/users', module: 'users', icon: <TeamOutlined />, plannedWeek: 1 },
];
