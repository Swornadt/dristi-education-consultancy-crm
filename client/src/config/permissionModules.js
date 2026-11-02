// The modules and actions that can be granted, used by the role editor and the per-user overrides.
// `scoped` modules can be limited to "own" records (assigned to or created by the person) or given for "all".
// The other modules are not about personal records, so they are simply on or off ("all").
export const PERMISSION_MODULES = [
  { key: 'leads', label: 'Leads', actions: ['view', 'create', 'update', 'delete'], scoped: true },
  { key: 'tasks', label: 'Tasks', actions: ['view', 'create', 'update', 'delete'], scoped: true },
  { key: 'students', label: 'Students', actions: ['view', 'create', 'update'], scoped: true },
  { key: 'documents', label: 'Documents', actions: ['view', 'create', 'update', 'delete'], scoped: true },
  { key: 'applications', label: 'Applications', actions: ['view', 'create', 'update', 'delete'], scoped: true },
  { key: 'catalog', label: 'Universities and programs', actions: ['view', 'create', 'update'], scoped: false },
  { key: 'accounts', label: 'Accounts', actions: ['view', 'create', 'update', 'delete'], scoped: false },
  { key: 'dashboard', label: 'Dashboard', actions: ['view'], scoped: true },
  { key: 'users', label: 'Users', actions: ['view', 'create', 'update'], scoped: false },
];

export const PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete'];
export const ACTION_LABELS = { view: 'View', create: 'Create', update: 'Edit', delete: 'Delete' };
