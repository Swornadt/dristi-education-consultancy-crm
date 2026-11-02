import { useEffect, useState } from 'react';
import { Alert, Button, Card, Dropdown, Input, Modal, Select, Space, Tag, Typography, message, theme } from 'antd';
import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { convertLead, listLeads, updateLeadStatus } from '../../api/leads';
import { useAuth } from '../../auth/AuthContext';
import Can from '../../components/Can';
import LeadStatusTag from '../../components/LeadStatusTag';
import { LEAD_SOURCES, LEAD_STATUSES, labelOf } from '../../config/leadOptions';
import { formatDate } from '../../utils/format';
import { dropBlockedReason, moveCard } from '../../utils/boardUtils';
import LeadFormModal from './LeadFormModal';
import LeadViewToggle from './LeadViewToggle';
import LostReasonModal from './LostReasonModal';
import useLeadLookups from './useLeadLookups';

const PER_COLUMN = 50;
const emptyColumns = () => Object.fromEntries(LEAD_STATUSES.map((s) => [s.value, { items: [], total: 0 }]));

export default function LeadBoardPage() {
  const { token } = theme.useToken();
  const { can, scopeOf } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const { countries, counselors } = useLeadLookups();

  const [filters, setFilters] = useState({});
  const [searchText, setSearchText] = useState('');
  const [columns, setColumns] = useState(emptyColumns);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [dragging, setDragging] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [lostTarget, setLostTarget] = useState(null);
  const [convertTarget, setConvertTarget] = useState(null);
  const [converting, setConverting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const seesAll = scopeOf('leads', 'view') === 'all';
  const canUpdate = can('leads', 'update');
  const canConvert = canUpdate && can('students', 'create');
  const reload = () => setRefreshKey((k) => k + 1);
  const permissions = { canUpdate, canConvert };

  // One request per column, so every column shows its own total.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(
      LEAD_STATUSES.map((s) => listLeads({ ...filters, status: s.value, limit: PER_COLUMN, sort: '-createdAt' }))
    )
      .then((results) => {
        if (cancelled) return;
        setColumns(Object.fromEntries(LEAD_STATUSES.map((s, i) => [s.value, { items: results[i].data, total: results[i].meta.total }])));
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
  }, [filters, refreshKey]);

  const setFilter = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  // Moves the card right away, then confirms with the server. On failure the board reloads to the true state.
  const applyStatus = async (lead, status, lostReason) => {
    setColumns((prev) => moveCard(prev, lead, status));
    try {
      await updateLeadStatus(lead.id, { status, lostReason });
      messageApi.success(`${lead.fullName} moved to ${labelOf(LEAD_STATUSES, status)}`);
      reload();
      return true;
    } catch (err) {
      messageApi.error(err.message);
      reload();
      return false;
    }
  };

  const move = (lead, toStatus) => {
    if (!lead || lead.status === toStatus) return;
    const blocked = dropBlockedReason(lead, toStatus, permissions);
    if (blocked) {
      messageApi.info(blocked);
      return;
    }
    if (toStatus === 'converted') setConvertTarget(lead);
    else if (toStatus === 'lost') setLostTarget(lead);
    else applyStatus(lead, toStatus);
  };

  const confirmConvert = async () => {
    setConverting(true);
    try {
      await convertLead(convertTarget.id);
      messageApi.success(`${convertTarget.fullName} is now a student`);
      setConvertTarget(null);
      reload();
    } catch (err) {
      messageApi.error(err.message);
    } finally {
      setConverting(false);
    }
  };

  const cardMenu = (lead) => ({
    items: LEAD_STATUSES.filter((s) => s.value !== lead.status && (s.value !== 'converted' || canConvert)).map((s) => ({
      key: s.value,
      label: s.value === 'converted' ? 'Convert to student' : `Move to ${s.label}`,
    })),
    onClick: ({ key }) => move(lead, key),
  });

  const renderCard = (lead) => {
    const movable = canUpdate && lead.status !== 'converted';
    const where = [lead.destinationCountry?.name, lead.desiredIntake && `${lead.desiredIntake.term} ${lead.desiredIntake.year}`].filter(Boolean).join(' · ');
    return (
      <Card
        key={lead.id}
        size="small"
        hoverable
        draggable={movable}
        onDragStart={(e) => {
          setDragging(lead);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(lead.id));
        }}
        onDragEnd={() => {
          setDragging(null);
          setOverColumn(null);
        }}
        style={{ cursor: movable ? 'grab' : 'default', opacity: dragging?.id === lead.id ? 0.5 : 1 }}
        styles={{ body: { padding: 10 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <Link to={`/leads/${lead.id}`} draggable={false}>
            <Typography.Text strong>{lead.fullName}</Typography.Text>
          </Link>
          {movable && (
            <Dropdown menu={cardMenu(lead)} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreOutlined />} aria-label={`Move ${lead.fullName}`} />
            </Dropdown>
          )}
        </div>
        <div>
          <Typography.Text type="secondary">{lead.phone || lead.email}</Typography.Text>
        </div>
        <div>{where || <Typography.Text type="secondary">No destination yet</Typography.Text>}</div>
        <Space size={4} wrap style={{ marginTop: 6 }}>
          <Tag style={{ margin: 0 }}>{labelOf(LEAD_SOURCES, lead.source)}</Tag>
          {seesAll && lead.assignedTo && (
            <Tag color="blue" style={{ margin: 0 }}>
              {lead.assignedTo.fullName}
            </Tag>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(lead.createdAt)}
          </Typography.Text>
        </Space>
      </Card>
    );
  };

  return (
    <>
      {contextHolder}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="start" wrap>
        <Space align="center" size={16} wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {seesAll ? 'Leads' : 'My leads'}
          </Typography.Title>
          <LeadViewToggle value="board" />
        </Space>
        <Can module="leads" action="create">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            Add lead
          </Button>
        </Can>
      </Space>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="Search name, phone or email"
          style={{ width: 260 }}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            if (!e.target.value && filters.q) setFilter({ q: undefined });
          }}
          onSearch={(value) => setFilter({ q: value.trim() || undefined })}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Destination"
          style={{ width: 170 }}
          value={filters.destinationCountryId}
          options={countries.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(value) => setFilter({ destinationCountryId: value })}
        />
        {seesAll && (
          <Select
            allowClear
            placeholder="Counselor"
            style={{ width: 170 }}
            value={filters.assignedTo}
            options={counselors.map((c) => ({ value: c.id, label: c.fullName }))}
            onChange={(value) => setFilter({ assignedTo: value })}
          />
        )}
        <Typography.Text type="secondary">
          {canUpdate ? 'Drag a card to another column, or use the menu on the card.' : 'You can view the pipeline but not change it.'}
        </Typography.Text>
      </Space>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
        {LEAD_STATUSES.map((status) => {
          const column = columns[status.value];
          const isTarget = dragging && overColumn === status.value && dragging.status !== status.value;
          return (
            <div
              key={status.value}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                if (overColumn !== status.value) setOverColumn(status.value);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const lead = dragging;
                setDragging(null);
                setOverColumn(null);
                move(lead, status.value);
              }}
              style={{
                flex: '0 0 280px',
                background: token.colorFillQuaternary,
                border: `2px ${isTarget ? 'dashed' : 'solid'} ${isTarget ? token.colorPrimary : 'transparent'}`,
                borderRadius: token.borderRadiusLG,
                padding: 10,
              }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 10 }}>
                <LeadStatusTag status={status.value} />
                <Typography.Text strong>{column.total}</Typography.Text>
              </Space>
              <div style={{ display: 'grid', gap: 8, maxHeight: 'calc(100vh - 320px)', minHeight: 60, overflowY: 'auto' }}>
                {column.items.map(renderCard)}
                {!loading && column.items.length === 0 && (
                  <Typography.Text type="secondary" style={{ padding: 8 }}>
                    No leads
                  </Typography.Text>
                )}
              </div>
              {column.total > column.items.length && (
                <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  Showing {column.items.length} of {column.total}. <Link to="/leads">Open the list</Link> to see all.
                </Typography.Text>
              )}
            </div>
          );
        })}
      </div>

      <LostReasonModal
        open={Boolean(lostTarget)}
        onCancel={() => setLostTarget(null)}
        onSubmit={async (reason) => {
          if (await applyStatus(lostTarget, 'lost', reason)) setLostTarget(null);
        }}
      />
      <Modal
        title="Convert to student?"
        open={Boolean(convertTarget)}
        onCancel={() => setConvertTarget(null)}
        onOk={confirmConvert}
        okText="Convert"
        confirmLoading={converting}
      >
        {convertTarget?.fullName} will get a student profile and a document checklist. Documents already attached to the lead carry over.
      </Modal>
      <LeadFormModal
        open={formOpen}
        countries={countries}
        counselors={counselors}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          messageApi.success('Lead added');
          reload();
        }}
      />
    </>
  );
}
