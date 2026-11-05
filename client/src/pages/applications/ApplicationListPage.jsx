import { useEffect, useState } from 'react';
import { Alert, Button, Card, DatePicker, Select, Space, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link, useNavigate } from 'react-router-dom';
import { listApplications } from '../../api/applications';
import { useAuth } from '../../auth/AuthContext';
import ApplicationStatusTag from '../../components/ApplicationStatusTag';
import Can from '../../components/Can';
import DeadlineText from '../../components/DeadlineText';
import { APPLICATION_STATUSES } from '../../config/applicationOptions';
import useCatalogCascade from '../../hooks/useCatalogCascade';
import { formatIntake } from '../../utils/format';
import useLeadLookups from '../leads/useLeadLookups';
import ApplicationFormModal from './ApplicationFormModal';

const DEFAULT_QUERY = { page: 1, limit: 20, sort: 'deadline' };
const FILTER_KEYS = ['status', 'countryId', 'universityId', 'programId', 'intakeId', 'assignedTo', 'deadlineFrom', 'deadlineTo'];

export default function ApplicationListPage() {
  const { scopeOf } = useAuth();
  const navigate = useNavigate();
  const { counselors } = useLeadLookups();

  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const { countries, universities, programs, intakes } = useCatalogCascade({
    countryId: query.countryId,
    universityId: query.universityId,
    programId: query.programId,
  });

  const seesAll = scopeOf('applications', 'view') === 'all';
  const hasFilters = FILTER_KEYS.some((k) => query[k]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listApplications(query)
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

  const columns = [
    {
      title: 'Student',
      render: (_, app) => (
        <div>
          <Link to={`/students/${app.student?.id}`}>
            <Typography.Text strong>{app.student?.fullName}</Typography.Text>
          </Link>
          {seesAll && app.assignedTo && (
            <div>
              <Typography.Text type="secondary">{app.assignedTo.fullName}</Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Program',
      render: (_, app) => (
        <div>
          <Link to={`/applications/${app.id}`}>{app.program?.name}</Link>
          <div>
            <Typography.Text type="secondary">
              {app.university?.name}, {app.country?.name}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    { title: 'Intake', render: (_, app) => formatIntake(app.intake) },
    {
      title: 'Deadline',
      dataIndex: 'deadline',
      sorter: true,
      sortOrder: query.sort === 'deadline' ? 'ascend' : query.sort === '-deadline' ? 'descend' : null,
      render: (_, app) => <DeadlineText deadline={app.deadline} status={app.status} />,
    },
    { title: 'Status', dataIndex: 'status', render: (s) => <ApplicationStatusTag status={s} /> },
  ];

  const handleTableChange = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const sort = s?.order === 'descend' ? '-deadline' : 'deadline';
    setQuery((prev) => ({ ...prev, page: pagination.current, limit: pagination.pageSize, sort }));
  };

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="start" wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {seesAll ? 'Applications' : 'My applications'}
        </Typography.Title>
        <Can module="applications" action="create">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            New application
          </Button>
        </Can>
      </Space>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear showSearch optionFilterProp="label" placeholder="Country" style={{ width: 160 }}
            value={query.countryId} options={countries.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => setFilter({ countryId: v, universityId: undefined, programId: undefined, intakeId: undefined })}
          />
          <Select
            allowClear showSearch optionFilterProp="label" placeholder="University" style={{ width: 220 }}
            disabled={!query.countryId} value={query.universityId}
            options={universities.map((u) => ({ value: u.id, label: u.name }))}
            onChange={(v) => setFilter({ universityId: v, programId: undefined, intakeId: undefined })}
          />
          <Select
            allowClear showSearch optionFilterProp="label" placeholder="Program" style={{ width: 220 }}
            disabled={!query.universityId} value={query.programId}
            options={programs.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(v) => setFilter({ programId: v, intakeId: undefined })}
          />
          <Select
            allowClear placeholder="Intake" style={{ width: 150 }}
            disabled={!query.programId} value={query.intakeId}
            options={intakes.map((i) => ({ value: i.id, label: formatIntake(i) }))}
            onChange={(v) => setFilter({ intakeId: v })}
          />
          <Select
            allowClear placeholder="Status" style={{ width: 160 }}
            value={query.status} options={APPLICATION_STATUSES} onChange={(v) => setFilter({ status: v })}
          />
          {seesAll && (
            <Select
              allowClear placeholder="Counselor" style={{ width: 170 }}
              value={query.assignedTo} options={counselors.map((c) => ({ value: c.id, label: c.fullName }))}
              onChange={(v) => setFilter({ assignedTo: v })}
            />
          )}
          <DatePicker.RangePicker
            placeholder={['Deadline from', 'Deadline to']}
            value={query.deadlineFrom && query.deadlineTo ? [dayjs(query.deadlineFrom), dayjs(query.deadlineTo)] : null}
            onChange={(dates) =>
              setFilter({ deadlineFrom: dates?.[0]?.format('YYYY-MM-DD'), deadlineTo: dates?.[1]?.format('YYYY-MM-DD') })
            }
          />
          {hasFilters && <Button onClick={() => setQuery(DEFAULT_QUERY)}>Clear filters</Button>}
        </Space>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={result.data}
          loading={loading}
          scroll={{ x: 800 }}
          onChange={handleTableChange}
          pagination={{
            current: query.page,
            pageSize: query.limit,
            total: result?.meta?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} applications`,
          }}
          locale={{ emptyText: hasFilters ? 'No applications match these filters.' : 'No applications yet.' }}
        />
      </Card>

      <ApplicationFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(app) => {
          setFormOpen(false);
          navigate(`/applications/${app.id}`);
        }}
      />
    </>
  );
}
