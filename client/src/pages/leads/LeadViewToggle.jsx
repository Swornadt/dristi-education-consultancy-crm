import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';

// Switches between the lead list and the pipeline board. `value` is 'list' or 'board'.
export default function LeadViewToggle({ value }) {
  const navigate = useNavigate();
  return (
    <Segmented
      value={value}
      onChange={(next) => navigate(next === 'board' ? '/leads/board' : '/leads')}
      options={[
        { value: 'list', label: 'List', icon: <UnorderedListOutlined /> },
        { value: 'board', label: 'Board', icon: <AppstoreOutlined /> },
      ]}
    />
  );
}
