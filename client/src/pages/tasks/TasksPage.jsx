import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Popconfirm, Select, Space, Table, Tabs, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { completeTask, deleteTask, listTasks } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import Can from '../../components/Can';
import TaskDue from '../../components/TaskDue';
import useLeadLookups from '../leads/useLeadLookups';
import TaskFormModal from './TaskFormModal';

const VIEWS = [
  { key: 'today', label: 'Today', empty: 'Nothing due today.' },
  { key: 'overdue', label: 'Overdue', empty: 'No overdue tasks.' },
  { key: 'upcoming', label: 'Upcoming', empty: 'No upcoming tasks.' },
  { key: 'all', label: 'All', empty: 'No tasks yet. Add the first one.' },
];

const DEFAULT_QUERY = { view: 'today', page: 1, limit: 20, sort: 'dueAt' };

export default function TasksPage() {
  const { can, scopeOf } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const { counselors } = useLeadLookups();

  const [searchParams] = useSearchParams();
  const initialView = VIEWS.find((v) => v.key === searchParams.get('view'))?.key ?? DEFAULT_QUERY.view;
  const [query, setQuery] = useState({ ...DEFAULT_QUERY, view: initialView });
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const seesAll = scopeOf('tasks', 'view') === 'all';
  const canUpdate = can('tasks', 'update');
  const reload = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listTasks(query)
      .then((res) => {
        if (!cancelled) setResult(res);
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
  }, [query, refreshKey]);

  const setFilter = (patch) => setQuery((prev) => ({ ...prev, ...patch, page: 1 }));

  const handleComplete = async (task) => {
    try {
      await completeTask(task.id);
      messageApi.success('Task completed');
      reload();
    } catch (err) {
      messageApi.error(err.message);
    }
  };

  const handleDelete = async (task) => {
    try {
      await deleteTask(task.id);
      messageApi.success('Task deleted');
      reload();
    } catch (err) {
      messageApi.error(err.message);
    }
  };

  const columns = [
    {
      title: '',
      width: 48,
      render: (_, task) => (
        <Checkbox
          checked={task.status === 'done'}
          disabled={task.status === 'done' || !canUpdate}
          onChange={() => handleComplete(task)}
          aria-label={`Complete ${task.title}`}
        />
      ),
    },
    {
      title: 'Task',
      dataIndex: 'title',
      render: (title, task) => (
        <div style={{ maxWidth: 360 }}>
          <Typography.Text delete={task.status === 'done'} type={task.status === 'done' ? 'secondary' : undefined} strong>
            {title}
          </Typography.Text>
          {task.description && (
            <div>
              <Typography.Text type="secondary" ellipsis>
                {task.description}
              </Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Due',
      dataIndex: 'dueAt',
      sorter: true,
      sortOrder: query.sort === 'dueAt' ? 'ascend' : query.sort === '-dueAt' ? 'descend' : null,
      render: (_, task) => <TaskDue task={task} />,
    },
    {
      title: 'Linked to',
      render: (_, task) => {
        if (task.lead) return <Link to={`/leads/${task.lead.id}`}>{task.lead.fullName}</Link>;
        if (task.student) return <Link to={`/students/${task.student.id}`}>{task.student.fullName}</Link>;
        return '-';
      },
    },
    { title: 'Assigned to', render: (_, task) => task.assignedTo?.fullName ?? '-' },
    {
      title: '',
      width: 96,
      render: (_, task) => (
        <Space size={4}>
          {can('tasks', 'update') && task.status === 'open' && (
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label="Edit task"
              onClick={() => {
                setEditing(task);
                setFormOpen(true);
              }}
            />
          )}
          <Can module="tasks" action="delete">
            <Popconfirm title="Delete this task?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(task)}>
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete task" />
            </Popconfirm>
          </Can>
        </Space>
      ),
    },
  ];

  const handleTableChange = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const sort = s?.order === 'descend' ? '-dueAt' : 'dueAt';
    setQuery((prev) => ({ ...prev, page: pagination.current, limit: pagination.pageSize, sort }));
  };

  const emptyText = VIEWS.find((v) => v.key === query.view)?.empty;

  return (
    <>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="start" wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {seesAll ? 'Tasks' : 'My tasks'}
        </Typography.Title>
        <Can module="tasks" action="create">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add task
          </Button>
        </Can>
      </Space>

      <Card>
        <Tabs
          activeKey={query.view}
          items={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
          onChange={(view) => setQuery((prev) => ({ ...prev, view, status: undefined, page: 1 }))}
        />

        {(seesAll || query.view === 'all') && (
          <Space wrap style={{ marginBottom: 16 }}>
            {query.view === 'all' && (
              <Select
                allowClear
                placeholder="Status"
                style={{ width: 150 }}
                value={query.status}
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'done', label: 'Done' },
                ]}
                onChange={(status) => setFilter({ status })}
              />
            )}
            {seesAll && (
              <Select
                allowClear
                placeholder="Assigned to"
                style={{ width: 180 }}
                value={query.assignedTo}
                options={counselors.map((c) => ({ value: c.id, label: c.fullName }))}
                onChange={(assignedTo) => setFilter({ assignedTo })}
              />
            )}
          </Space>
        )}

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={result.data}
          loading={loading}
          scroll={{ x: 800 }}
          onChange={handleTableChange}
          pagination={{
            current: query.page,
            pageSize: query.limit,
            total: result.meta.total,
            showSizeChanger: true,
            showTotal: (total) => `${total} tasks`,
          }}
          locale={{ emptyText }}
        />
      </Card>

      <TaskFormModal
        open={formOpen}
        task={editing}
        counselors={counselors}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          messageApi.success(editing ? 'Task updated' : 'Task added');
          reload();
        }}
      />
    </>
  );
}
