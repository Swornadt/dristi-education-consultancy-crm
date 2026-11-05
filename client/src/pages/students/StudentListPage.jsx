import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { listStudents } from '../../api/students';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../utils/format';
import useLeadLookups from '../leads/useLeadLookups';

const DEFAULT_QUERY = { page: 1, limit: 20, sort: '-createdAt' };
const FILTER_KEYS = ['q', 'assignedTo', 'preferredCountryId'];

export default function StudentListPage() {
  const { scopeOf, can } = useAuth();
  const { countries, counselors } = useLeadLookups();

  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const seesAll = scopeOf('students', 'view') === 'all';
  const hasFilters = FILTER_KEYS.some((k) => query[k]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listStudents(query)
      .then((res) => {
        if (!cancelled) setResult(res);
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
  }, [query]);

  const setFilter = (patch) => setQuery((prev) => ({ ...prev, ...patch, page: 1 }));
  const clearFilters = () => {
    setSearchText('');
    setQuery(DEFAULT_QUERY);
  };
  const sortOrder = (field) => (query.sort === field ? 'ascend' : query.sort === `-${field}` ? 'descend' : null);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'fullName',
      sorter: true,
      sortOrder: sortOrder('fullName'),
      render: (name, student) => (
        <div>
          <Link to={`/students/${student.id}`}>
            <Typography.Text strong>{name}</Typography.Text>
          </Link>
          <div>
            <Typography.Text type="secondary">{student.phone || student.email}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Counselor',
      render: (_, student) =>
        student.assignedTo?.fullName ?? <Typography.Text type="secondary">Unassigned</Typography.Text>,
    },
    {
      title: 'Preferred countries',
      render: (_, student) =>
        student.preferredCountries?.length ? (
          <Space size={[4, 4]} wrap>
            {student.preferredCountries.map((c) => (
              <Tag key={c.id}>{c.name}</Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: 'Added',
      dataIndex: 'createdAt',
      sorter: true,
      sortOrder: sortOrder('createdAt'),
      render: formatDate,
    },
  ];

  const handleTableChange = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const sort = s?.order ? (s.order === 'descend' ? `-${s.field}` : s.field) : DEFAULT_QUERY.sort;
    setQuery((prev) => ({ ...prev, page: pagination.current, limit: pagination.pageSize, sort }));
  };

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {seesAll ? 'Students' : 'My students'}
      </Typography.Title>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search name, phone or email"
            allowClear
            style={{ width: 260 }}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              if (!e.target.value && query.q) setFilter({ q: undefined });
            }}
            onSearch={(value) => setFilter({ q: value.trim() || undefined })}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Preferred country"
            style={{ width: 190 }}
            value={query.preferredCountryId}
            options={countries.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(value) => setFilter({ preferredCountryId: value })}
          />
          {seesAll && (
            <Select
              allowClear
              placeholder="Counselor"
              style={{ width: 170 }}
              value={query.assignedTo}
              options={counselors.map((c) => ({ value: c.id, label: c.fullName }))}
              onChange={(value) => setFilter({ assignedTo: value })}
            />
          )}
          {hasFilters && <Button onClick={clearFilters}>Clear filters</Button>}
        </Space>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={result.data}
          loading={loading}
          scroll={{ x: 700 }}
          onChange={handleTableChange}
          pagination={{
            current: query.page,
            pageSize: query.limit,
            total: result?.meta?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} students`,
          }}
          locale={{
            emptyText: hasFilters
              ? 'No students match these filters.'
              : can('leads', 'update')
                ? 'No students yet. Convert a lead to create one.'
                : 'No students yet.',
          }}
        />
      </Card>
    </>
  );
}
