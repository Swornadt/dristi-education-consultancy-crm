import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, Input, List, Popconfirm, Select, Space, Tag, Typography, Upload, message } from 'antd';
import { DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { listDocumentTypes } from '../../api/documentTypes';
import { downloadFile } from '../../api/files';
import { deleteLeadDocument, listLeadDocuments, uploadLeadDocument } from '../../api/leadDocuments';
import { useAuth } from '../../auth/AuthContext';
import { UPLOAD_ACCEPT } from '../../config/studentOptions';
import { formatDate } from '../../utils/format';
import { formatFileSize, validateUpload } from '../../utils/files';

// Documents a counselor attaches to a lead. They carry over to the student's profile after conversion.
export default function LeadDocumentsCard({ lead }) {
  const { can } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [docs, setDocs] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [typeId, setTypeId] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      setDocs(await listLeadDocuments(lead.id));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lead.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    listDocumentTypes()
      .then(setDocTypes)
      .catch(() => {
        // Document types are optional for uploads; a silent failure just means the
        // type picker stays empty. No need to surface this to the user.
      });
  }, []);

  const run = async (action, successText) => {
    setBusy(true);
    try {
      await action();
      messageApi.success(successText);
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

  return (
    <Card title="Documents" loading={loading}>
      {contextHolder}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

      {can('documents', 'create') && (
        <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: docs.length ? 16 : 0 }}>
          <Space wrap>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Document type (optional)"
              style={{ width: 220 }}
              value={typeId}
              onChange={setTypeId}
              options={docTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
            <Input placeholder="Note (optional)" style={{ width: 200 }} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
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
                run(() => uploadLeadDocument(lead.id, { file, documentTypeId: typeId, note }), 'Document uploaded').then((ok) => {
                  if (ok) {
                    setTypeId(null);
                    setNote('');
                    onSuccess({});
                  } else {
                    onError(new Error('Upload failed'));
                  }
                });
              }}
            >
              <Button icon={<UploadOutlined />} loading={busy}>
                Choose file and upload
              </Button>
            </Upload>
          </Space>
          <Typography.Text type="secondary">PDF, JPG, PNG or DOCX, up to 10 MB. Pick the type and note first, then choose the file.</Typography.Text>
        </Space>
      )}

      {!error && docs.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No documents yet. Attach passports, transcripts and test results here." style={{ marginTop: 8 }} />
      )}

      {docs.length > 0 && (
        <List
          size="small"
          dataSource={docs}
          renderItem={(doc) => (
            <List.Item
              actions={[
                <Button key="download" type="text" size="small" icon={<DownloadOutlined />} aria-label="Download" onClick={() => handleDownload(doc.file)} />,
                can('documents', 'delete') && (
                  <Popconfirm
                    key="delete"
                    title="Remove this document?"
                    okText="Remove"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => run(() => deleteLeadDocument(lead.id, doc.id), 'Document removed')}
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Remove document" disabled={busy} />
                  </Popconfirm>
                ),
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={
                  <Space size={8} wrap>
                    <Typography.Link onClick={() => handleDownload(doc.file)}>{doc.file.originalName}</Typography.Link>
                    {doc.documentType && <Tag style={{ margin: 0 }}>{doc.documentType.name}</Tag>}
                  </Space>
                }
                description={[doc.note, `${formatFileSize(doc.file.sizeBytes)} · ${doc.createdBy?.fullName ?? ''} · ${formatDate(doc.createdAt)}`]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
