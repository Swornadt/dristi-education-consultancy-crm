import { useEffect, useState } from 'react';
import { Alert, Button, Card, DatePicker, Input, Select, Space, Table, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link, useNavigate } from 'react-router-dom';
import { listLeads } from '../../api/leads';
import { useAuth } from '../../auth/AuthContext';
import Can from '../../components/Can';
import LeadStatusTag from '../../components/LeadStatusTag';
import { LEAD_SOURCES, LEAD_STATUSES, labelOf } from '../../config/leadOptions';
import { formatDate, formatIntake } from '../../utils/format';
import LeadFormModal from './LeadFormModal';
import LeadViewToggle from './LeadViewToggle';
import useLeadLookups from './useLeadLookups';

const DEFAULT_QUERY = { page: 1, limit: 20, sort: '-createdAt' };
const FILTER_KEYS = ['q', 'status', 'source', 'destinationCountryId', 'assignedTo', 'createdFrom', 'createdTo'];

export default function LeadListPage() {
  const { scopeOf } = useAuth();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const { countries, counselors } = useLeadLookups();

  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const seesAll = scopeOf('leads', 'view') === 'all';
  const hasFilters = FILTER_KEYS.some((k) => query[k]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listLeads(query)
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

  // Changing a filter always goes back to page 1.
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
      render: (name, lead) => (
        <div>
          <Link to={`/leads/${lead.id}`}>
            <Typography.Text strong>{name}</Typography.Text>
          </Link>
          <div>
            <Typography.Text type="secondary">{lead.phone || lead.email}</Typography.Text>
          </div>
        </div>
      ),
    },
    { title: 'Status', dataIndex: 'status', render: (s) => <LeadStatusTag status={s} /> },
    { title: 'Source', dataIndex: 'source', render: (s) => labelOf(LEAD_SOURCES, s) },
    { title: 'Destination', render: (_, lead) => lead.destinationCountry?.name ?? '-' },
    { title: 'Intake', render: (_, lead) => formatIntake(lead.desiredIntake) },
    {
      title: 'Assigned to',
      render: (_, lead) =>
        lead.assignedTo?.fullName ?? <Typography.Text type="secondary">Unassigned</Typography.Text>,
    },
    {
      title: 'Created',
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
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="start" wrap>
        <Space align="center" size={16} wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {seesAll ? 'Leads' : 'My leads'}
          </Typography.Title>
          <LeadViewToggle value="list" />
        </Space>
        <Can module="leads" action="create">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            Add lead
          </Button>
        </Can>
      </Space>

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
            placeholder="Status"
            style={{ width: 190 }}
            value={query.status}
            options={LEAD_STATUSES}
            onChange={(value) => setFilter({ status: value })}
          />
          <Select
            allowClear
            placeholder="Source"
            style={{ width: 140 }}
            value={query.source}
            options={LEAD_SOURCES}
            onChange={(value) => setFilter({ source: value })}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Destination"
            style={{ width: 170 }}
            value={query.destinationCountryId}
            options={countries.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(value) => setFilter({ destinationCountryId: value })}
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
          <DatePicker.RangePicker
            value={query.createdFrom && query.createdTo ? [dayjs(query.createdFrom), dayjs(query.createdTo)] : null}
            onChange={(dates) =>
              setFilter({
                createdFrom: dates?.[0]?.format('YYYY-MM-DD'),
                createdTo: dates?.[1]?.format('YYYY-MM-DD'),
              })
            }
          />
          {hasFilters && <Button onClick={clearFilters}>Clear filters</Button>}
        </Space>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={result.data}
          loading={loading}
          scroll={{ x: 900 }}
          onChange={handleTableChange}
          pagination={{
            current: query.page,
            pageSize: query.limit,
            total: result.meta.total,
            showSizeChanger: true,
            showTotal: (total) => `${total} leads`,
          }}
          locale={{
            emptyText: hasFilters ? 'No leads match these filters.' : 'No leads yet. Add the first one.',
          }}
        />
      </Card>

      <LeadFormModal
        open={formOpen}
        countries={countries}
        counselors={counselors}
        onClose={() => setFormOpen(false)}
        onSaved={(lead) => {
          setFormOpen(false);
          messageApi.success('Lead added');
          navigate(`/leads/${lead.id}`);
        }}
      />
    </>
  );
}
