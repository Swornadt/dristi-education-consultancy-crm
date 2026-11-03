import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, Input, List, Popconfirm, Progress, Select, Space, Table, Tag, Typography, Upload, message } from 'antd';
import { DeleteOutlined, DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { listDocumentTypes } from '../../api/documentTypes';
import { downloadFile } from '../../api/files';
import {
  addChecklistItem,
  deleteChecklistItem,
  listStudentDocuments,
  updateChecklistItem,
  uploadChecklistFile,
} from '../../api/students';
import { useAuth } from '../../auth/AuthContext';
import Can from '../../components/Can';
import { labelOf } from '../../config/leadOptions';
import { DOC_STATUSES, UPLOAD_ACCEPT } from '../../config/studentOptions';
import { formatDate } from '../../utils/format';
import { formatFileSize, validateUpload } from '../../utils/files';

export default function DocumentChecklist({ studentId }) {
  const { can } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [data, setData] = useState({ checklist: [], leadAttachments: [] });
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newType, setNewType] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await listStudentDocuments(studentId));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    listDocumentTypes()
      .then(setDocTypes)
      .catch(() => {});
  }, []);

  // Runs an action, shows the result and refreshes. Returns true on success.
  const run = async (action, successText) => {
    setBusy(true);
    try {
      await action();
      if (successText) messageApi.success(successText);
      await load();
      return true;
    } catch (err) {
      messageApi.error(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      await downloadFile(file);
    } catch (err) {
      messageApi.error(err.message);
    }
  };

  const canUpdate = can('documents', 'update');
  const { checklist, leadAttachments } = data;
  const verified = checklist.filter((i) => i.status === 'verified').length;
  const availableTypes = docTypes.filter((t) => !checklist.some((i) => i.documentType.id === t.id));

  const columns = [
    { title: 'Document', dataIndex: ['documentType', 'name'] },
    {
      title: 'Status',
      width: 150,
      render: (_, item) =>
        canUpdate ? (
          <Select
            size="small"
            style={{ width: 120 }}
            value={item.status}
            disabled={busy}
            options={DOC_STATUSES}
            onChange={(status) => run(() => updateChecklistItem(studentId, item.id, { status }), 'Status updated')}
          />
        ) : (
          <Tag color={DOC_STATUSES.find((s) => s.value === item.status)?.color}>{labelOf(DOC_STATUSES, item.status)}</Tag>
        ),
    },
    {
      title: 'File',
      width: 220,
      render: (_, item) =>
        item.file ? (
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(item.file)} style={{ padding: 0 }}>
            {item.file.originalName} ({formatFileSize(item.file.sizeBytes)})
          </Button>
        ) : (
          <Typography.Text type="secondary">No file</Typography.Text>
        ),
    },
    {
      title: 'Remarks',
      width: 220,
      render: (_, item) =>
        canUpdate ? (
          <Input
            key={`${item.id}-${item.remarks ?? ''}`}
            size="small"
            variant="borderless"
            placeholder="Add remarks"
            defaultValue={item.remarks ?? ''}
            onPressEnter={(e) => e.target.blur()}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value !== (item.remarks ?? '')) run(() => updateChecklistItem(studentId, item.id, { remarks: value || null }));
            }}
          />
        ) : (
          item.remarks ?? '-'
        ),
    },
    {
      title: '',
      width: 170,
      render: (_, item) => (
        <Space size={4}>
          <Can module="documents" action="create">
            <Upload
              showUploadList={false}
              accept={UPLOAD_ACCEPT}
              disabled={busy}
              beforeUpload={(file) => {
                const problem = validateUpload(file);
                if (problem) {
                  messageApi.error(problem);
                  return Upload.LIST_IGNORE;
                }
                return true;
              }}
              customRequest={({ file, onSuccess, onError }) => {
                run(() => uploadChecklistFile(studentId, item.id, file), 'File uploaded').then((ok) =>
                  ok ? onSuccess({}) : onError(new Error('Upload failed'))
                );
              }}
            >
              <Button size="small" icon={<UploadOutlined />} disabled={busy}>
                {item.file ? 'Replace' : 'Upload'}
              </Button>
            </Upload>
          </Can>
          <Can module="documents" action="delete">
            <Popconfirm
              title="Remove from checklist?"
              okText="Remove"
              okButtonProps={{ danger: true }}
              onConfirm={() => run(() => deleteChecklistItem(studentId, item.id), 'Removed from checklist')}
            >
              <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Remove from checklist" disabled={busy} />
            </Popconfirm>
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Document checklist"
      extra={
        checklist.length > 0 && (
          <Space>
            <Typography.Text type="secondary">
              {verified} of {checklist.length} verified
            </Typography.Text>
            <Progress
              type="circle"
              size={28}
              percent={Math.round((verified / checklist.length) * 100)}
              showInfo={false}
            />
          </Space>
        )
      }
    >
      {contextHolder}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={checklist}
        loading={loading}
        pagination={false}
        scroll={{ x: 860 }}
        locale={{ emptyText: 'No documents on the checklist yet.' }}
      />

      <Can module="documents" action="create">
        <Space style={{ marginTop: 16 }} wrap>
          <Select
            showSearch
            optionFilterProp="label"
            style={{ width: 260 }}
            placeholder="Add a document type"
            value={newType}
            onChange={setNewType}
            options={availableTypes.map((t) => ({ value: t.id, label: t.name }))}
            notFoundContent="Everything is already on the checklist"
          />
          <Button
            icon={<PlusOutlined />}
            disabled={!newType || busy}
            onClick={async () => {
              if (await run(() => addChecklistItem(studentId, newType), 'Added to checklist')) setNewType(null);
            }}
          >
            Add to checklist
          </Button>
        </Space>
      </Can>

      {leadAttachments.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Typography.Title level={5}>Attached while this was a lead</Typography.Title>
          <List
            size="small"
            dataSource={leadAttachments}
            renderItem={(doc) => (
              <List.Item
                actions={[
                  <Button key="download" type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(doc.file)}>
                    Download
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={doc.file.originalName}
                  description={[doc.documentType?.name, doc.note, formatDate(doc.createdAt)].filter(Boolean).join(' · ')}
                />
              </List.Item>
            )}
          />
        </div>
      )}
      {!loading && checklist.length === 0 && leadAttachments.length === 0 && !error && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Add the documents this student needs to provide." style={{ marginTop: 16 }} />
      )}
    </Card>
  );
}
