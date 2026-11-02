import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, List, Popconfirm, Space, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { completeTask, deleteTask, listTasks } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import Can from '../../components/Can';
import TaskDue from '../../components/TaskDue';
import TaskFormModal from './TaskFormModal';

// Follow-ups for one lead, shown on the lead detail page.
export default function LeadTasksCard({ lead, counselors }) {
  const { can } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listTasks({ leadId: lead.id, limit: 50, sort: 'dueAt' });
      // Open tasks first (already in due order), completed ones after.
      setTasks([...res.data.filter((t) => t.status === 'open'), ...res.data.filter((t) => t.status !== 'open')]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lead.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const run = async (action, successText) => {
    try {
      await action();
      messageApi.success(successText);
      await load();
    } catch (err) {
      messageApi.error(err.message);
    }
  };

  const canUpdate = can('tasks', 'update');

  return (
    <Card
      title="Follow-ups"
      loading={loading}
      extra={
        <Can module="tasks" action="create">
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add follow-up
          </Button>
        </Can>
      }
    >
      {contextHolder}
      {error && <Alert type="error" showIcon message={error} />}
      {!error && tasks.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No follow-ups yet. Add one so this lead isn't forgotten." />
      )}
      {tasks.length > 0 && (
        <List
          size="small"
          dataSource={tasks}
          renderItem={(task) => (
            <List.Item
              actions={[
                canUpdate && task.status === 'open' && (
                  <Button
                    key="edit"
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    aria-label="Edit task"
                    onClick={() => {
                      setEditing(task);
                      setFormOpen(true);
                    }}
                  />
                ),
                can('tasks', 'delete') && (
                  <Popconfirm
                    key="delete"
                    title="Delete this task?"
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => run(() => deleteTask(task.id), 'Task deleted')}
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Delete task" />
                  </Popconfirm>
                ),
              ].filter(Boolean)}
            >
              <Space align="start">
                <Checkbox
                  checked={task.status === 'done'}
                  disabled={task.status === 'done' || !canUpdate}
                  onChange={() => run(() => completeTask(task.id), 'Task completed')}
                  aria-label={`Complete ${task.title}`}
                />
                <div>
                  <Typography.Text delete={task.status === 'done'} type={task.status === 'done' ? 'secondary' : undefined}>
                    {task.title}
                  </Typography.Text>
                  <div>
                    <TaskDue task={task} />
                    {task.assignedTo && (
                      <Typography.Text type="secondary"> · {task.assignedTo.fullName}</Typography.Text>
                    )}
                  </div>
                </div>
              </Space>
            </List.Item>
          )}
        />
      )}

      <TaskFormModal
        open={formOpen}
        task={editing}
        lead={lead}
        counselors={counselors}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          messageApi.success(editing ? 'Task updated' : 'Follow-up added');
          load();
        }}
      />
    </Card>
  );
}
