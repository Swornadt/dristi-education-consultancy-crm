import { Tag } from 'antd';
import { LEAD_STATUSES } from '../config/leadOptions';

export default function LeadStatusTag({ status }) {
  const option = LEAD_STATUSES.find((s) => s.value === status);
  return <Tag color={option?.color ?? 'default'}>{option?.label ?? status}</Tag>;
}
