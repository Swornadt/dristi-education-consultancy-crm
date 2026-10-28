import { useAuth } from '../auth/AuthContext';

// Show children only if the user has the permission. Use it for buttons and sections:
//   <Can module="leads" action="create"><Button>New lead</Button></Can>
// The server enforces permissions too; this only keeps the UI tidy.
export default function Can({ module, action = 'view', children, fallback = null }) {
  const { can } = useAuth();
  return can(module, action) ? children : fallback;
}
