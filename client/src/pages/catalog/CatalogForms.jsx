import { useEffect, useState } from 'react';
import { Alert, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import {
  createCountry, createIntake, createProgram, createUniversity,
  updateCountry, updateIntake, updateProgram, updateUniversity,
} from '../../api/catalog';
import CascadeFields from '../../components/CascadeFields';
import { PROGRAM_LEVELS } from '../../config/applicationOptions';
import { INTAKE_TERMS } from '../../config/leadOptions';
import useCatalogCascade from '../../hooks/useCatalogCascade';

const thisYear = new Date().getFullYear();

// Shared modal: validates, runs onSubmit(values), maps API validation errors onto fields.
function FormShell({ title, open, onClose, onSubmit, initialValues, width = 520, children }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Start every opening with a clean slate.
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err.details?.length) form.setFields(err.details.map((d) => ({ name: d.field, errors: [d.message] })));
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Save"
      confirmLoading={saving}
      width={width}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={initialValues} requiredMark={false}>
        {typeof children === 'function' ? children(form) : children}
      </Form>
    </Modal>
  );
}

const trimmed = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);

export function CountryForm({ open, record, onClose, onSaved }) {
  return (
    <FormShell
      title={record ? 'Edit country' : 'Add country'}
      open={open}
      onClose={onClose}
      initialValues={record ?? undefined}
      onSubmit={async (v) => {
        const payload = { name: v.name.trim(), isoCode: trimmed(v.isoCode) };
        if (record) await updateCountry(record.id, payload);
        else await createCountry(payload);
        onSaved();
      }}
    >
      <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: 'Enter a name.' }]}>
        <Input autoFocus />
      </Form.Item>
      <Form.Item name="isoCode" label="ISO code" rules={[{ pattern: /^[A-Za-z]{2}$/, message: 'Use a 2-letter code, for example AU.' }]}>
        <Input maxLength={2} style={{ width: 120 }} />
      </Form.Item>
    </FormShell>
  );
}

export function UniversityForm({ open, record, onClose, onSaved }) {
  const { countries } = useCatalogCascade();
  return (
    <FormShell
      title={record ? 'Edit university' : 'Add university'}
      open={open}
      onClose={onClose}
      initialValues={record ? { ...record, countryId: record.country?.id } : undefined}
      onSubmit={async (v) => {
        const payload = { countryId: v.countryId, name: v.name.trim(), city: trimmed(v.city), website: trimmed(v.website), notes: trimmed(v.notes) };
        if (record) await updateUniversity(record.id, payload);
        else await createUniversity(payload);
        onSaved();
      }}
    >
      <Form.Item name="countryId" label="Country" rules={[{ required: true, message: 'Choose a country.' }]}>
        <Select showSearch optionFilterProp="label" options={countries.map((c) => ({ value: c.id, label: c.name }))} />
      </Form.Item>
      <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: 'Enter a name.' }]}>
        <Input />
      </Form.Item>
      <Row gutter={16}>
        <Col span={10}>
          <Form.Item name="city" label="City">
            <Input />
          </Form.Item>
        </Col>
        <Col span={14}>
          <Form.Item name="website" label="Website">
            <Input placeholder="https://" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="notes" label="Notes">
        <Input.TextArea rows={3} />
      </Form.Item>
    </FormShell>
  );
}

export function ProgramForm({ open, record, onClose, onSaved }) {
  return (
    <FormShell
      title={record ? 'Edit program' : 'Add program'}
      open={open}
      onClose={onClose}
      width={600}
      initialValues={record ?? undefined}
      onSubmit={async (v) => {
        const payload = {
          name: v.name.trim(),
          level: v.level,
          fieldOfStudy: trimmed(v.fieldOfStudy),
          durationMonths: v.durationMonths ?? null,
          tuitionFee: v.tuitionFee ?? null,
          currency: trimmed(v.currency)?.toUpperCase() ?? null,
        };
        if (record) await updateProgram(record.id, payload);
        else await createProgram({ ...payload, universityId: v.universityId });
        onSaved();
      }}
    >
      {(form) => (
        <>
          {record ? (
            <Form.Item label="University">
              <Typography.Text>{record.university?.name}</Typography.Text>
            </Form.Item>
          ) : (
            <CascadeFields form={form} upTo="university" />
          )}
          <Row gutter={16}>
            <Col xs={24} sm={14}>
              <Form.Item name="name" label="Program name" rules={[{ required: true, whitespace: true, message: 'Enter a name.' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item name="level" label="Level" rules={[{ required: true, message: 'Choose a level.' }]}>
                <Select options={PROGRAM_LEVELS} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="fieldOfStudy" label="Field of study">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="durationMonths" label="Duration (months)">
                <InputNumber min={1} max={120} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="tuitionFee" label="Tuition per year">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="currency" label="Currency" rules={[{ pattern: /^[A-Za-z]{3}$/, message: '3 letters' }]}>
                <Input maxLength={3} />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </FormShell>
  );
}

export function IntakeForm({ open, record, onClose, onSaved }) {
  return (
    <FormShell
      title={record ? 'Edit intake' : 'Add intake'}
      open={open}
      onClose={onClose}
      initialValues={record ? { term: record.term, year: record.year, applicationDeadline: record.applicationDeadline ? dayjs(record.applicationDeadline) : undefined } : { year: thisYear + 1 }}
      onSubmit={async (v) => {
        const payload = {
          term: v.term,
          year: v.year,
          applicationDeadline: v.applicationDeadline ? v.applicationDeadline.format('YYYY-MM-DD') : null,
        };
        if (record) await updateIntake(record.id, payload);
        else await createIntake({ ...payload, programId: v.programId });
        onSaved();
      }}
    >
      {(form) => (
        <>
          {record ? (
            <Form.Item label="Program">
              <Typography.Text>
                {record.program?.name}, {record.university?.name}
              </Typography.Text>
            </Form.Item>
          ) : (
            <CascadeFields form={form} upTo="program" />
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="term" label="Term" rules={[{ required: true, message: 'Choose a term.' }]}>
                <Select options={INTAKE_TERMS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="year" label="Year" rules={[{ required: true, message: 'Enter a year.' }]}>
                <InputNumber min={2000} max={2100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="applicationDeadline" label="Application deadline">
            <DatePicker style={{ width: '100%' }} format="D MMM YYYY" />
          </Form.Item>
        </>
      )}
    </FormShell>
  );
}
