import { Badge, Button, Divider, Empty, List, Popover, Spin, Tooltip, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import useTaskAlerts from '../hooks/useTaskAlerts';
import { useAuth } from '../auth/AuthContext';

dayjs.extend(relativeTime);

function TaskRow({ task, overdue }) {
  const when = overdue
    ? dayjs(task.dueAt).fromNow()           // "3 days ago"
    : dayjs(task.dueAt).format('h:mm A');   // "2:30 PM" (today)
  const lead = task.lead?.fullName ?? task.student?.fullName ?? null;
  return (
    <List.Item style={{ padding: '6px 0', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography.Text
          ellipsis
          style={{ display: 'block', color: overdue ? 'var(--ant-color-error)' : undefined }}
        >
          {task.title}
        </Typography.Text>
        {lead && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {lead}
          </Typography.Text>
        )}
      </div>
      <Typography.Text
        type={overdue ? 'danger' : 'secondary'}
        style={{ fontSize: 12, marginLeft: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        {when}
      </Typography.Text>
    </List.Item>
  );
}

function Section({ title, tasks, overdue, emptyText }) {
  return (
    <>
      <Typography.Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </Typography.Text>
      {tasks.length === 0 ? (
        <Typography.Text type="secondary" style={{ display: 'block', margin: '6px 0 2px', fontSize: 13 }}>
          {emptyText}
        </Typography.Text>
      ) : (
        <List
          size="small"
          dataSource={tasks}
          renderItem={(t) => <TaskRow key={t.id} task={t} overdue={overdue} />}
          style={{ marginTop: 2 }}
        />
      )}
    </>
  );
}

export default function TaskAlertsPopover() {
  const { can } = useAuth();
  const enabled = can('tasks', 'view');
  const { overdue, dueToday, loading, refresh } = useTaskAlerts(enabled);

  if (!enabled) return null;

  const total = overdue.length + dueToday.length;
  const hasMore20 = overdue.length === 20 || dueToday.length === 20;

  const content = (
    <div style={{ width: 320 }}>
      {loading && overdue.length === 0 && dueToday.length === 0 ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : (
        <>
          <Section
            title="Overdue"
            tasks={overdue}
            overdue
            emptyText="No overdue tasks."
          />
          {overdue.length > 0 && dueToday.length > 0 && <Divider style={{ margin: '8px 0' }} />}
          <Section
            title="Due today"
            tasks={dueToday}
            overdue={false}
            emptyText="Nothing due today."
          />
          {total === 0 && overdue.length === 0 && dueToday.length === 0 && (
            <Empty description="You're all caught up." image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '12px 0' }} />
          )}
          {hasMore20 && (
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
              Showing up to 20 per group.
            </Typography.Text>
          )}
          <Divider style={{ margin: '10px 0 6px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/tasks">Open tasks</Link>
            <Button size="small" type="text" onClick={refresh} loading={loading}>
              Refresh
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const bell = (
    <Tooltip title="Tasks" placement="bottom">
      <Badge
        count={total}
        overflowCount={99}
        size="small"
        color={overdue.length > 0 ? undefined : 'blue'}
        style={{ cursor: 'pointer' }}
      >
        <BellOutlined style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)' }} />
      </Badge>
    </Tooltip>
  );

  return (
    <Popover
      content={content}
      title={null}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      onOpenChange={(open) => open && refresh()}
      overlayStyle={{ paddingTop: 4 }}
      overlayInnerStyle={{ padding: '12px 14px' }}
    >
      <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
        {bell}
      </span>
    </Popover>
  );
}
