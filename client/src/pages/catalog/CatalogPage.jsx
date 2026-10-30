import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  listCountryPage, listIntakePage, listProgramPage, listUniversityPage,
  updateCountry, updateIntake, updateProgram, updateUniversity,
} from '../../api/catalog';
import { useAuth } from '../../auth/AuthContext';
import { PROGRAM_LEVELS } from '../../config/applicationOptions';
import { labelOf } from '../../config/leadOptions';
import useCatalogCascade from '../../hooks/useCatalogCascade';
import { formatDate, formatIntake } from '../../utils/format';
import { CountryForm, IntakeForm, ProgramForm, UniversityForm } from './CatalogForms';

// Loads one page of a catalog list and keeps filters, paging and refresh state.
function useCatalogTable(load, includeInactive) {
  const [query, setQuery] = useState({ page: 1, limit: 20 });
  const [state, setState] = useState({ data: [], meta: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load({ ...query, ...(includeInactive ? { includeInactive: true } : {}) })
      .then((res) => {
        if (!cancelled) setState(res);
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
  }, [load, query, includeInactive, refreshKey]);

  return {
    query,
    state,
    loading,
    error,
    reload: () => setRefreshKey((k) => k + 1),
    setFilter: (patch) => setQuery((prev) => ({ ...prev, ...patch, page: 1 })),
    onTableChange: (p) => setQuery((prev) => ({ ...prev, page: p.current, limit: p.pageSize })),
  };
}

// Active switch and edit button for admins; a read-only status tag for everyone else.
function useManageColumns({ canUpdate, update, reload, onEdit }) {
  const [messageApi, contextHolder] = message.useMessage();
  const toggle = async (record, isActive) => {
    try {
      await update(record.id, { isActive });
      messageApi.success(isActive ? 'Activated' : 'Deactivated');
      reload();
    } catch (err) {
      messageApi.error(err.message);
    }
  };
  const columns = canUpdate
    ? [
        { title: 'Active', width: 90, render: (_, r) => <Switch size="small" checked={r.isActive} onChange={(v) => toggle(r, v)} /> },
        { title: '', width: 56, render: (_, r) => <Button type="text" icon={<EditOutlined />} aria-label="Edit" onClick={() => onEdit(r)} /> },
      ]
    : [{ title: 'Status', width: 100, render: (_, r) => (r.isActive ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) }];
  return { columns, contextHolder };
}

// Shared layout: filters, "Add" button, table.
function CatalogTable({ table, columns, filters, addLabel, canCreate, onAdd, emptyText, scrollX }) {
  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap align="start">
        <Space wrap>{filters}</Space>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            {addLabel}
          </Button>
        )}
      </Space>
      {table.error && <Alert type="error" showIcon message={table.error} style={{ marginBottom: 16 }} />}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={table.state.data}
        loading={table.loading}
        scroll={{ x: scrollX }}
        onChange={table.onTableChange}
        pagination={{
          current: table.query.page,
          pageSize: table.query.limit,
          total: table.state.meta.total,
          showSizeChanger: true,
          showTotal: (total) => `${total} items`,
        }}
        locale={{ emptyText }}
      />
    </>
  );
}

function SearchBox({ table, placeholder }) {
  const [text, setText] = useState('');
  return (
    <Input.Search
      allowClear
      placeholder={placeholder}
      style={{ width: 240 }}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        if (!e.target.value && table.query.q) table.setFilter({ q: undefined });
      }}
      onSearch={(value) => table.setFilter({ q: value.trim() || undefined })}
    />
  );
}

const countryOptions = (countries) => countries.map((c) => ({ value: c.id, label: c.name }));

function CountriesTab({ canCreate, canUpdate }) {
  const table = useCatalogTable(listCountryPage, canUpdate);
  const [form, setForm] = useState({ open: false, record: null });
  const manage = useManageColumns({ canUpdate, update: updateCountry, reload: table.reload, onEdit: (record) => setForm({ open: true, record }) });
  const columns = [
    { title: 'Country', dataIndex: 'name' },
    { title: 'ISO code', dataIndex: 'isoCode', render: (v) => v ?? '-' },
    ...manage.columns,
  ];
  return (
    <>
      {manage.contextHolder}
      <CatalogTable
        table={table} columns={columns} addLabel="Add country" canCreate={canCreate} emptyText="No countries yet." scrollX={500}
        onAdd={() => setForm({ open: true, record: null })}
        filters={<SearchBox table={table} placeholder="Search countries" />}
      />
      <CountryForm open={form.open} record={form.record} onClose={() => setForm({ open: false, record: null })}
        onSaved={() => { setForm({ open: false, record: null }); table.reload(); }} />
    </>
  );
}

function UniversitiesTab({ canCreate, canUpdate }) {
  const table = useCatalogTable(listUniversityPage, canUpdate);
  const { countries } = useCatalogCascade();
  const [form, setForm] = useState({ open: false, record: null });
  const manage = useManageColumns({ canUpdate, update: updateUniversity, reload: table.reload, onEdit: (record) => setForm({ open: true, record }) });
  const columns = [
    {
      title: 'University',
      render: (_, u) => (
        <div>
          <Typography.Text strong>{u.name}</Typography.Text>
          {u.city && <div><Typography.Text type="secondary">{u.city}</Typography.Text></div>}
        </div>
      ),
    },
    { title: 'Country', render: (_, u) => u.country?.name ?? '-' },
    { title: 'Website', dataIndex: 'website', render: (v) => (v ? <a href={v} target="_blank" rel="noreferrer">{v}</a> : '-') },
    ...manage.columns,
  ];
  return (
    <>
      {manage.contextHolder}
      <CatalogTable
        table={table} columns={columns} addLabel="Add university" canCreate={canCreate} emptyText="No universities found." scrollX={700}
        onAdd={() => setForm({ open: true, record: null })}
        filters={
          <>
            <SearchBox table={table} placeholder="Search universities" />
            <Select allowClear showSearch optionFilterProp="label" placeholder="Country" style={{ width: 180 }}
              value={table.query.countryId} options={countryOptions(countries)} onChange={(v) => table.setFilter({ countryId: v })} />
          </>
        }
      />
      <UniversityForm open={form.open} record={form.record} onClose={() => setForm({ open: false, record: null })}
        onSaved={() => { setForm({ open: false, record: null }); table.reload(); }} />
    </>
  );
}

function ProgramsTab({ canCreate, canUpdate }) {
  const table = useCatalogTable(listProgramPage, canUpdate);
  const { countries, universities } = useCatalogCascade({ countryId: table.query.countryId });
  const [form, setForm] = useState({ open: false, record: null });
  const manage = useManageColumns({ canUpdate, update: updateProgram, reload: table.reload, onEdit: (record) => setForm({ open: true, record }) });
  const columns = [
    {
      title: 'Program',
      render: (_, p) => (
        <div>
          <Typography.Text strong>{p.name}</Typography.Text>
          {p.fieldOfStudy && <div><Typography.Text type="secondary">{p.fieldOfStudy}</Typography.Text></div>}
        </div>
      ),
    },
    { title: 'Level', dataIndex: 'level', render: (v) => <Tag>{labelOf(PROGRAM_LEVELS, v)}</Tag> },
    { title: 'University', render: (_, p) => `${p.university?.name ?? '-'}${p.country ? `, ${p.country.name}` : ''}` },
    { title: 'Duration', dataIndex: 'durationMonths', render: (v) => (v ? `${v} months` : '-') },
    {
      title: 'Tuition / year',
      render: (_, p) => (p.tuitionFee != null ? `${p.currency ?? ''} ${Number(p.tuitionFee).toLocaleString()}`.trim() : '-'),
    },
    ...manage.columns,
  ];
  return (
    <>
      {manage.contextHolder}
      <CatalogTable
        table={table} columns={columns} addLabel="Add program" canCreate={canCreate} emptyText="No programs found." scrollX={900}
        onAdd={() => setForm({ open: true, record: null })}
        filters={
          <>
            <SearchBox table={table} placeholder="Search programs" />
            <Select allowClear showSearch optionFilterProp="label" placeholder="Country" style={{ width: 160 }}
              value={table.query.countryId} options={countryOptions(countries)}
              onChange={(v) => table.setFilter({ countryId: v, universityId: undefined })} />
            <Select allowClear showSearch optionFilterProp="label" placeholder="University" style={{ width: 220 }}
              disabled={!table.query.countryId} value={table.query.universityId}
              options={universities.map((u) => ({ value: u.id, label: u.name }))} onChange={(v) => table.setFilter({ universityId: v })} />
            <Select allowClear placeholder="Level" style={{ width: 140 }} value={table.query.level} options={PROGRAM_LEVELS}
              onChange={(v) => table.setFilter({ level: v })} />
          </>
        }
      />
      <ProgramForm open={form.open} record={form.record} onClose={() => setForm({ open: false, record: null })}
        onSaved={() => { setForm({ open: false, record: null }); table.reload(); }} />
    </>
  );
}

function IntakesTab({ canCreate, canUpdate }) {
  const table = useCatalogTable(listIntakePage, canUpdate);
  const { countries, universities, programs } = useCatalogCascade({
    countryId: table.query.countryId,
    universityId: table.query.universityId,
  });
  const [form, setForm] = useState({ open: false, record: null });
  const manage = useManageColumns({ canUpdate, update: updateIntake, reload: table.reload, onEdit: (record) => setForm({ open: true, record }) });
  const columns = [
    { title: 'Intake', render: (_, i) => <Typography.Text strong>{formatIntake(i)}</Typography.Text> },
    { title: 'Program', render: (_, i) => i.program?.name ?? '-' },
    { title: 'University', render: (_, i) => `${i.university?.name ?? '-'}${i.country ? `, ${i.country.name}` : ''}` },
    { title: 'Deadline', dataIndex: 'applicationDeadline', render: formatDate },
    ...manage.columns,
  ];
  return (
    <>
      {manage.contextHolder}
      <CatalogTable
        table={table} columns={columns} addLabel="Add intake" canCreate={canCreate} emptyText="No intakes found." scrollX={800}
        onAdd={() => setForm({ open: true, record: null })}
        filters={
          <>
            <Select allowClear showSearch optionFilterProp="label" placeholder="Country" style={{ width: 160 }}
              value={table.query.countryId} options={countryOptions(countries)}
              onChange={(v) => table.setFilter({ countryId: v, universityId: undefined, programId: undefined })} />
            <Select allowClear showSearch optionFilterProp="label" placeholder="University" style={{ width: 220 }}
              disabled={!table.query.countryId} value={table.query.universityId}
              options={universities.map((u) => ({ value: u.id, label: u.name }))}
              onChange={(v) => table.setFilter({ universityId: v, programId: undefined })} />
            <Select allowClear showSearch optionFilterProp="label" placeholder="Program" style={{ width: 220 }}
              disabled={!table.query.universityId} value={table.query.programId}
              options={programs.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => table.setFilter({ programId: v })} />
          </>
        }
      />
      <IntakeForm open={form.open} record={form.record} onClose={() => setForm({ open: false, record: null })}
        onSaved={() => { setForm({ open: false, record: null }); table.reload(); }} />
    </>
  );
}

export default function CatalogPage() {
  const { can } = useAuth();
  const canCreate = can('catalog', 'create');
  const canUpdate = can('catalog', 'update');
  const props = { canCreate, canUpdate };

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Universities and programs
      </Typography.Title>
      <Card>
        <Tabs
          items={[
            { key: 'universities', label: 'Universities', children: <UniversitiesTab {...props} /> },
            { key: 'programs', label: 'Programs', children: <ProgramsTab {...props} /> },
            { key: 'intakes', label: 'Intakes', children: <IntakesTab {...props} /> },
            { key: 'countries', label: 'Countries', children: <CountriesTab {...props} /> },
          ]}
        />
      </Card>
    </>
  );
}
