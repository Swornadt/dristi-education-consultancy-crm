import { Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { formatDate } from '../utils/format';

// Shows a deadline and warns about drafts that are close to it or past it.
// Once an application is submitted, the deadline no longer needs a warning.
export default function DeadlineText({ deadline, status }) {
  if (!deadline) return '-';
  let tag = null;
  if (status === 'draft') {
    const days = dayjs(deadline).startOf('day').diff(dayjs().startOf('day'), 'day');
    if (days < 0) tag = <Tag color="red" style={{ margin: 0 }}>Overdue</Tag>;
    else if (days === 0) tag = <Tag color="red" style={{ margin: 0 }}>Today</Tag>;
    else if (days <= 14) tag = <Tag color="gold" style={{ margin: 0 }}>{days} days left</Tag>;
  }
  return (
    <Space size={6} wrap>
      <span>{formatDate(deadline)}</span>
      {tag}
    </Space>
  );
}
