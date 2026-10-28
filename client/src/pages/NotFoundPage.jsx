import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="Page not found"
      subTitle="The address may be wrong, or the page may have moved."
      extra={<Button onClick={() => navigate('/')}>Back to home</Button>}
    />
  );
}
