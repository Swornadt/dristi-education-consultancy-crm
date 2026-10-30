import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Input, Popconfirm, Row, Select, Space, Statistic, Table, Tag, Typography, message, theme } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, TagsOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { deleteAccountEntry, getAccountsSummary, listAccountCategories, listAccountEntries } from '../../api/accounts';
import BarList from '../../components/BarList';
import { formatDate } from '../../utils/format';
import { formatMoney } from '../../utils/money';
import CategoriesModal from './CategoriesModal';
import EntryFormModal from './EntryFormModal';

const DEFAULT_QUERY = { page: 1, limit: 20, sort: '-entryDate' };

export default function AccountsPage() {
  const { token } = theme.useToken();
  const [messageApi, contextHolder] = message.useMessage();

  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [searchText, setSearchText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [categories, setCategories] = useState([]);
  const [categoriesKey, setCategoriesKey] = useState(0);

  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [entries, setEntries] = useState({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [entryForm, setEntryForm] = useState({ open: false, entry: null });
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const monthKey = month.format('YYYY-MM');
  const reload = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    listAccountCategories({ includeInactive: true })
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [categoriesKey]);

  useEffect(() => {
    let cancelled = false;
    setSummaryError(null);
    getAccountsSummary(monthKey)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        if (!cancelled) setSummaryError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [monthKey, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAccountEntries({ ...query, from: month.startOf('month').format('YYYY-MM-DD'), to: month.endOf('month').format('YYYY-MM-DD') })
      .then((res) => {
        if (!cancelled) setEntries(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, monthKey, refreshKey]);

  const setFilter = (patch) => setQuery((prev) => ({ ...prev, ...patch, page: 1 }));
  const hasFilters = Boolean(query.categoryId || query.kind || query.q);

  const handleDelete = async (entry) => {
    try {
      await deleteAccountEntry(entry.id);
      messageApi.success('Entry deleted');
      reload();
    } catch (err) {
      messageApi.error(err.message);
    }
  };

  const sortOrder = (field) => (query.sort === field ? 'ascend' : query.sort === `-${field}` ? 'descend' : null);

  const columns = [
    { title: 'Date', dataIndex: 'entryDate', sorter: true, sortOrder: sortOrder('entryDate'), width: 120, render: formatDate },
    {
      title: 'Category',
      render: (_, e) => <Tag color={e.category.kind === 'income' ? 'green' : 'default'}>{e.category.name}</Tag>,
    },
    {
      title: 'Details',
      render: (_, e) => (
        <div>
          {e.description ?? <Typography.Text type="secondary">No description</Typography.Text>}
          {e.payeeName && (
            <div>
              <Typography.Text type="secondary">{e.payeeName}</Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    { title: 'Covers', dataIndex: 'periodMonth', width: 110, render: (v) => (v ? dayjs(v).format('MMM YYYY') : '-') },
    { title: 'Reference', dataIndex: 'referenceNo', render: (v) => v ?? '-' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      sorter: true,
      sortOrder: sortOrder('amount'),
      render: (_, e) => (
        <Typography.Text strong style={{ color: e.category.kind === 'income' ? token.colorSuccess : token.colorError }}>
          {e.category.kind === 'income' ? '+' : '-'}
          {formatMoney(e.amount)}
        </Typography.Text>
      ),
    },
    {
      title: '',
      width: 90,
      render: (_, entry) => (
        <Space size={4}>
          <Button type="text" icon={<EditOutlined />} aria-label="Edit entry" onClick={() => setEntryForm({ open: true, entry })} />
          <Popconfirm title="Delete this entry?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(entry)}>
            <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete entry" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleTableChange = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const sort = s?.order ? (s.order === 'descend' ? `-${s.field}` : s.field) : DEFAULT_QUERY.sort;
    setQuery((prev) => ({ ...prev, page: pagination.current, limit: pagination.pageSize, sort }));
  };

  const breakdown = (kind) =>
    (summary?.byCategory ?? []).filter((c) => c.kind === kind).map((c) => ({ key: c.categoryId, label: c.name, value: c.total }));

  return (
    <>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="start" wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Accounts
        </Typography.Title>
        <Space wrap>
          <DatePicker
            picker="month"
            allowClear={false}
            value={month}
            format="MMMM YYYY"
            onChange={(value) => {
              if (!value) return;
              setMonth(value.startOf('month'));
              setQuery((prev) => ({ ...prev, page: 1 }));
            }}
          />
          <Button icon={<TagsOutlined />} onClick={() => setCategoriesOpen(true)}>
            Categories
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEntryForm({ open: true, entry: null })}>
            Add entry
          </Button>
        </Space>
      </Space>

      {summaryError && <Alert type="error" showIcon message={summaryError} style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card loading={!summary}>
            <Statistic title="Income" value={formatMoney(summary?.totalIncome)} valueStyle={{ color: token.colorSuccess }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={!summary}>
            <Statistic title="Expenses" value={formatMoney(summary?.totalExpense)} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={!summary}>
            <Statistic
              title="Net"
              value={formatMoney(summary?.net)}
              valueStyle={{ color: (summary?.net ?? 0) < 0 ? token.colorError : token.colorSuccess }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Expenses by category" loading={!summary}>
            <BarList items={breakdown('expense')} formatValue={formatMoney} emptyText="No expenses this month." />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Income by category" loading={!summary}>
            <BarList items={breakdown('income')} formatValue={formatMoney} emptyText="No income recorded this month." />
          </Card>
        </Col>

        <Col span={24}>
          <Card title={`Entries, ${month.format('MMMM YYYY')}`}>
            <Space wrap style={{ marginBottom: 16 }}>
              <Input.Search
                allowClear
                placeholder="Search description, payee or reference"
                style={{ width: 280 }}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (!e.target.value && query.q) setFilter({ q: undefined });
                }}
                onSearch={(value) => setFilter({ q: value.trim() || undefined })}
              />
              <Select
                allowClear
                placeholder="Type"
                style={{ width: 130 }}
                value={query.kind}
                options={[
                  { value: 'expense', label: 'Expenses' },
                  { value: 'income', label: 'Income' },
                ]}
                onChange={(value) => setFilter({ kind: value })}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Category"
                style={{ width: 200 }}
                value={query.categoryId}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(value) => setFilter({ categoryId: value })}
              />
              {hasFilters && (
                <Button
                  onClick={() => {
                    setSearchText('');
                    setQuery({ ...DEFAULT_QUERY, sort: query.sort });
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Space>

            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

            <Table
              rowKey="id"
              columns={columns}
              dataSource={entries.data}
              loading={loading}
              scroll={{ x: 860 }}
              onChange={handleTableChange}
              pagination={{
                current: query.page,
                pageSize: query.limit,
                total: entries.meta.total,
                showSizeChanger: true,
                showTotal: (total) => `${total} entries`,
              }}
              locale={{ emptyText: hasFilters ? 'No entries match these filters.' : 'No entries this month.' }}
            />
          </Card>
        </Col>
      </Row>

      <EntryFormModal
        open={entryForm.open}
        entry={entryForm.entry}
        categories={categories}
        onClose={() => setEntryForm({ open: false, entry: null })}
        onSaved={() => {
          messageApi.success(entryForm.entry ? 'Entry updated' : 'Entry added');
          setEntryForm({ open: false, entry: null });
          reload();
        }}
      />
      <CategoriesModal
        open={categoriesOpen}
        categories={categories}
        onClose={() => setCategoriesOpen(false)}
        onChanged={() => {
          setCategoriesKey((k) => k + 1);
          reload();
        }}
      />
    </>
  );
}
