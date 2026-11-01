import { useEffect, useState } from 'react';
import { Alert, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import dayjs from 'dayjs';
import { createAccountEntry, updateAccountEntry } from '../../api/accounts';
import { CURRENCY_CODE } from '../../utils/money';

// Add (no `entry`) or edit (with `entry`) an income or expense entry.
export default function EntryFormModal({ open, entry, categories, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(entry);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  // Active categories, grouped by kind. When editing, keep the entry's own category even if it was deactivated.
  const usable = categories.filter((c) => c.isActive || c.id === entry?.category?.id);
  const categoryOptions = [
    { label: 'Expenses', options: usable.filter((c) => c.kind === 'expense').map((c) => ({ value: c.id, label: c.name })) },
    { label: 'Income', options: usable.filter((c) => c.kind === 'income').map((c) => ({ value: c.id, label: c.name })) },
  ].filter((group) => group.options.length);

  const initialValues = entry
    ? {
        categoryId: entry.category.id,
        entryDate: dayjs(entry.entryDate),
        amount: Number(entry.amount),
        description: entry.description ?? undefined,
        payeeName: entry.payeeName ?? undefined,
        periodMonth: entry.periodMonth ? dayjs(entry.periodMonth) : undefined,
        referenceNo: entry.referenceNo ?? undefined,
      }
    : { entryDate: dayjs() };

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const orNull = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);
    const payload = {
      categoryId: values.categoryId,
      entryDate: values.entryDate.format('YYYY-MM-DD'),
      amount: values.amount,
      description: orNull(values.description),
      payeeName: orNull(values.payeeName),
      periodMonth: values.periodMonth ? values.periodMonth.startOf('month').format('YYYY-MM-DD') : null,
      referenceNo: orNull(values.referenceNo),
    };

    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await updateAccountEntry(entry.id, payload);
      } else {
        // On create, leave out empty fields instead of sending nulls.
        await createAccountEntry(Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null)));
      }
      onSaved();
    } catch (err) {
      if (err.details?.length) form.setFields(err.details.map((d) => ({ name: d.field, errors: [d.message] })));
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit entry' : 'Add entry'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Save changes' : 'Add entry'}
      confirmLoading={saving}
      width={560}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={initialValues} requiredMark={false}>
        <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: 'Choose a category.' }]}>
          <Select showSearch optionFilterProp="label" placeholder="Select a category" options={categoryOptions} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="entryDate" label="Date" rules={[{ required: true, message: 'Choose a date.' }]}>
              <DatePicker allowClear={false} style={{ width: '100%' }} format="D MMM YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="amount"
              label="Amount"
              rules={[{ required: true, message: 'Enter an amount.' }, { type: 'number', min: 0.01, message: 'Must be greater than zero.' }]}
            >
              <InputNumber addonBefore={CURRENCY_CODE} min={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="payeeName" label="Paid to or received from">
          <Input placeholder="For example: landlord, staff member, vendor" />
        </Form.Item>
        <Form.Item name="periodMonth" label="Covers month" extra="For rent and salaries: the month this payment is for.">
          <DatePicker picker="month" format="MMMM YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={14}>
            <Form.Item name="description" label="Description">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={10}>
            <Form.Item name="referenceNo" label="Reference no.">
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
