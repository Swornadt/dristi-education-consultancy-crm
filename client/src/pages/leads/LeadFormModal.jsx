import { useState } from 'react';
import { Alert, Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import { createLead, updateLead } from '../../api/leads';
import { useAuth } from '../../auth/AuthContext';
import { INTAKE_TERMS, LEAD_SOURCES, TEST_STATUSES } from '../../config/leadOptions';

const currentYear = new Date().getFullYear();

// Create (no `lead` prop) or edit (with `lead`) a lead.
export default function LeadFormModal({ open, lead, countries, counselors, onClose, onSaved }) {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(lead);

  const initialValues = lead
    ? {
        fullName: lead.fullName,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        source: lead.source,
        destinationCountryId: lead.destinationCountry?.id,
        intakeTerm: lead.desiredIntake?.term,
        intakeYear: lead.desiredIntake?.year,
        testStatus: lead.testStatus,
        assignedTo: lead.assignedTo?.id,
        notes: lead.notes ?? undefined,
      }
    : {
        source: 'walk_in',
        testStatus: 'not_taken',
        // A counselor adding a lead is assigned to it by default.
        assignedTo: user.role === 'counselor' ? user.id : undefined,
      };

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // field errors are already shown
    }

    const payload = {
      fullName: values.fullName.trim(),
      email: values.email || null,
      phone: values.phone || null,
      source: values.source,
      destinationCountryId: values.destinationCountryId ?? null,
      desiredIntake: values.intakeTerm && values.intakeYear ? { term: values.intakeTerm, year: values.intakeYear } : null,
      testStatus: values.testStatus,
      assignedTo: values.assignedTo ?? null,
      notes: values.notes || null,
    };

    setSaving(true);
    setError(null);
    try {
      let saved;
      if (isEdit) {
        saved = await updateLead(lead.id, payload);
      } else {
        // On create, leave out empty fields instead of sending nulls.
        const clean = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null));
        saved = await createLead(clean);
      }
      onSaved(saved);
    } catch (err) {
      if (err.details?.length) {
        form.setFields(
          err.details.map((d) => ({ name: d.field === 'desiredIntake' ? 'intakeTerm' : d.field, errors: [d.message] }))
        );
      }
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit lead' : 'Add lead'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Save changes' : 'Add lead'}
      confirmLoading={saving}
      width={640}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={initialValues} requiredMark={false}>
        <Form.Item name="fullName" label="Full name" rules={[{ required: true, whitespace: true, message: "Enter the lead's name." }]}>
          <Input autoFocus />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="phone"
              label="Phone"
              dependencies={['email']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (value || getFieldValue('email')) return Promise.resolve();
                    return Promise.reject(new Error('Enter a phone number or an email.'));
                  },
                }),
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Enter a valid email address.' }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="source" label="Source">
              <Select options={LEAD_SOURCES} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="destinationCountryId" label="Destination country">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Select a country"
                options={countries.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={12} sm={8}>
            <Form.Item name="intakeTerm" label="Intake" dependencies={['intakeYear']}>
              <Select allowClear placeholder="Term" options={INTAKE_TERMS} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item
              name="intakeYear"
              label="Intake year"
              dependencies={['intakeTerm']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const term = getFieldValue('intakeTerm');
                    if ((term && !value) || (!term && value)) {
                      return Promise.reject(new Error('Choose both a term and a year.'));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber min={currentYear} max={2100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="testStatus" label="English test">
              <Select options={TEST_STATUSES} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="assignedTo" label="Assigned counselor">
          <Select
            allowClear={!isEdit}
            placeholder="Unassigned"
            options={counselors.map((c) => ({ value: c.id, label: c.fullName }))}
          />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
