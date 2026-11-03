import { useState } from 'react';
import { Alert, Button, Input, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { createAccountCategory, updateAccountCategory } from '../../api/accounts';

const KINDS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

// Manage the categories used by entries. A category's kind can't change once created.
export default function CategoriesModal({ open, categories, onClose, onChanged }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('expense');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const run = async (action, successText) => {
    try {
      await action();
      if (successText) messageApi.success(successText);
      onChanged();
      return true;
    } catch (err) {
      messageApi.error(err.message);
      return false;
    }
  };

  const add = async () => {
    if (!name.trim()) {
      setError('Enter a name for the category.');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await createAccountCategory({ name: name.trim(), kind });
      setName('');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      render: (_, c) => (
        <Typography.Text editable={{ tooltip: 'Rename', onChange: (value) => value.trim() && value.trim() !== c.name && run(() => updateAccountCategory(c.id, { name: value.trim() }), 'Renamed') }}>
          {c.name}
        </Typography.Text>
      ),
    },
    { title: 'Type', dataIndex: 'kind', width: 100, render: (k) => <Tag color={k === 'income' ? 'green' : 'red'}>{k === 'income' ? 'Income' : 'Expense'}</Tag> },
    {
      title: 'Active',
      width: 80,
      render: (_, c) => (
        <Switch size="small" checked={c.isActive} onChange={(isActive) => run(() => updateAccountCategory(c.id, { isActive }), isActive ? 'Activated' : 'Deactivated')} />
      ),
    },
  ];

  return (
    <Modal title="Categories" open={open} onCancel={onClose} footer={null} width={560} destroyOnClose>
      {contextHolder}
      <Table rowKey="id" size="small" columns={columns} dataSource={categories} pagination={false} />
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        Inactive categories stay on past entries but can't be used for new ones.
      </Typography.Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      <Space.Compact style={{ width: '100%' }}>
        <Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} onPressEnter={add} />
        <Select value={kind} options={KINDS} onChange={setKind} style={{ width: 120 }} />
        <Button type="primary" icon={<PlusOutlined />} loading={adding} onClick={add}>
          Add
        </Button>
      </Space.Compact>
    </Modal>
  );
}
