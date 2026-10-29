import { Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { formatDate, formatDateTime } from '../utils/format';

// Shows when a task is due, with a flag for overdue and due-today tasks.
export default function TaskDue({ task }) {
  if (task.status === 'done') {
    return <Typography.Text type="secondary">Done {formatDate(task.completedAt)}</Typography.Text>;
  }
  if (task.isOverdue) {
    return (
      <Space size={6}>
        <Tag color="red" style={{ margin: 0 }}>Overdue</Tag>
        <span>{formatDateTime(task.dueAt)}</span>
      </Space>
    );
  }
  const due = dayjs(task.dueAt);
  if (due.isSame(dayjs(), 'day')) {
    return (
      <Space size={6}>
        <Tag color="gold" style={{ margin: 0 }}>Today</Tag>
        <span>{due.format('h:mm A')}</span>
      </Space>
    );
  }
  return <span>{formatDateTime(task.dueAt)}</span>;
}
