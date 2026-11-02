import { useState } from 'react';
import { Alert, Col, DatePicker, Form, Input, Modal, Row, Select } from 'antd';
import dayjs from 'dayjs';
import { setPreferredCountries, updateStudent } from '../../api/students';
import { GENDERS } from '../../config/studentOptions';

// Edit a student's personal details and preferred countries.
export default function StudentFormModal({ open, student, countries, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const initialCountryIds = student.preferredCountries.map((c) => c.id);
  const initialValues = {
    fullName: student.fullName,
    phone: student.phone ?? undefined,
    email: student.email ?? undefined,
    dateOfBirth: student.dateOfBirth ? dayjs(student.dateOfBirth) : undefined,
    gender: student.gender ?? undefined,
    nationality: student.nationality ?? undefined,
    address: student.address ?? undefined,
    guardianName: student.guardianName ?? undefined,
    guardianPhone: student.guardianPhone ?? undefined,
    preferredCountryIds: initialCountryIds,
    preferredCourses: student.preferredCourses ?? undefined,
    notes: student.notes ?? undefined,
  };

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const orNull = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);
    const payload = {
      fullName: values.fullName.trim(),
      phone: orNull(values.phone),
      email: orNull(values.email),
      dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
      gender: values.gender ?? null,
      nationality: orNull(values.nationality),
      address: orNull(values.address),
      guardianName: orNull(values.guardianName),
      guardianPhone: orNull(values.guardianPhone),
      preferredCourses: orNull(values.preferredCourses),
      notes: orNull(values.notes),
    };

    setSaving(true);
    setError(null);
    try {
      await updateStudent(student.id, payload);
      const ids = values.preferredCountryIds ?? [];
      const changed = ids.length !== initialCountryIds.length || ids.some((id) => !initialCountryIds.includes(id));
      if (changed) await setPreferredCountries(student.id, ids);
      onSaved();
    } catch (err) {
      if (err.details?.length) {
        form.setFields(err.details.map((d) => ({ name: d.field === 'countryIds' ? 'preferredCountryIds' : d.field, errors: [d.message] })));
      }
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit student"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Save changes"
      confirmLoading={saving}
      width={680}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={initialValues} requiredMark={false}>
        <Form.Item name="fullName" label="Full name" rules={[{ required: true, whitespace: true, message: "Enter the student's name." }]}>
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Phone">
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
          <Col xs={24} sm={8}>
            <Form.Item name="dateOfBirth" label="Date of birth">
              <DatePicker style={{ width: '100%' }} format="D MMM YYYY" disabledDate={(d) => d.isAfter(dayjs())} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="gender" label="Gender">
              <Select allowClear options={GENDERS} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="nationality" label="Nationality">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="address" label="Address">
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="guardianName" label="Guardian name">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="guardianPhone" label="Guardian phone">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="preferredCountryIds" label="Preferred countries">
          <Select
            mode="multiple"
            optionFilterProp="label"
            placeholder="Select countries"
            options={countries.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="preferredCourses" label="Preferred courses">
          <Input placeholder="For example: Nursing, Public Health" />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
