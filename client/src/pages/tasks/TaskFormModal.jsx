import { useEffect, useRef, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { listLeads } from '../../api/leads';
import { createTask, updateTask } from '../../api/tasks';

const toLeadOption = (lead) => ({ value: lead.id, label: `${lead.fullName} (${lead.phone || lead.email})` });

// Add a task (no `task` prop) or edit one (with `task`).
// Pass `lead` to fix the linked lead (as on the lead page); otherwise a lead picker is shown.
export default function TaskFormModal({ open, task, lead, counselors, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [leadOptions, setLeadOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  const isEdit = Boolean(task);
  const needsLeadPicker = !isEdit && !lead;
  const linkedName = lead?.fullName ?? task?.lead?.fullName ?? task?.student?.fullName ?? null;

  // Pre-load a few recent leads so the picker isn't empty before typing.
  useEffect(() => {
    if (!open || !needsLeadPicker) return undefined;
    let cancelled = false;
    listLeads({ limit: 10, sort: '-createdAt' })
      .then((res) => {
        if (!cancelled) setLeadOptions(res.data.map(toLeadOption));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, needsLeadPicker]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const searchLeads = (text) => {
    clearTimeout(timer.current);
    if (!text.trim()) return;
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await listLeads({ q: text.trim(), limit: 10, sort: 'fullName' });
        setLeadOptions(res.data.map(toLeadOption));
      } catch {
        setLeadOptions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const initialValues = task
    ? {
        title: task.title,
        description: task.description ?? undefined,
        dueAt: dayjs(task.dueAt),
        assignedTo: task.assignedTo?.id,
      }
    : { dueAt: dayjs().add(1, 'day').hour(10).minute(0).second(0).millisecond(0) };

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = { title: values.title.trim(), dueAt: values.dueAt.toISOString() };
    const description = values.description?.trim();
    if (values.assignedTo) payload.assignedTo = values.assignedTo;

    setSaving(true);
    setError(null);
    try {
      let saved;
      if (isEdit) {
        saved = await updateTask(task.id, { ...payload, description: description || null });
      } else {
        if (description) payload.description = description;
        payload.leadId = lead ? lead.id : values.leadId;
        saved = await createTask(payload);
      }
      onSaved(saved);
    } catch (err) {
      if (err.details?.length) {
        form.setFields(err.details.map((d) => ({ name: d.field, errors: [d.message] })));
      }
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit task' : 'Add task'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Save changes' : 'Add task'}
      confirmLoading={saving}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={initialValues} requiredMark={false}>
        {linkedName && (
          <Form.Item label="Linked to">
            <Typography.Text>{linkedName}</Typography.Text>
          </Form.Item>
        )}
        {needsLeadPicker && (
          <Form.Item name="leadId" label="Lead" rules={[{ required: true, message: 'Choose a lead.' }]}>
            <Select
              showSearch
              filterOption={false}
              onSearch={searchLeads}
              loading={searching}
              options={leadOptions}
              placeholder="Search by name, phone or email"
              notFoundContent={searching ? 'Searching...' : 'No leads found'}
            />
          </Form.Item>
        )}
        <Form.Item name="title" label="Task" rules={[{ required: true, whitespace: true, message: 'Enter a title.' }]}>
          <Input autoFocus placeholder="For example: Call to confirm counseling session" />
        </Form.Item>
        <Form.Item name="dueAt" label="Due" rules={[{ required: true, message: 'Choose a due date and time.' }]}>
          <DatePicker
            allowClear={false}
            style={{ width: '100%' }}
            format="D MMM YYYY, h:mm A"
            showTime={{ format: 'h:mm A', use12Hours: true, minuteStep: 5 }}
            disabledDate={isEdit ? undefined : (d) => d.isBefore(dayjs().startOf('day'))}
          />
        </Form.Item>
        <Form.Item name="assignedTo" label="Assigned to">
          <Select
            allowClear={false}
            placeholder="Me"
            options={counselors.map((c) => ({ value: c.id, label: c.fullName }))}
          />
        </Form.Item>
        <Form.Item name="description" label="Notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
