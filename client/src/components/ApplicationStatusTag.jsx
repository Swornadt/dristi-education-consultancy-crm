import { Tag } from 'antd';
import { APPLICATION_STATUSES } from '../config/applicationOptions';

export default function ApplicationStatusTag({ status }) {
  const option = APPLICATION_STATUSES.find((s) => s.value === status);
  return <Tag color={option?.color ?? 'default'}>{option?.label ?? status}</Tag>;
}
