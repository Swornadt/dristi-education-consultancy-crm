import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="You don't have access to this page"
      subTitle="Ask an admin if you think you should."
      extra={<Button onClick={() => navigate('/')}>Back to home</Button>}
    />
  );
}
