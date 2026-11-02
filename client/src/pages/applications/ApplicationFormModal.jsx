import { useEffect, useRef, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { createApplication } from '../../api/applications';
import { listStudents } from '../../api/students';
import CascadeFields from '../../components/CascadeFields';

const toStudentOption = (s) => ({ value: s.id, label: `${s.fullName} (${s.phone || s.email || 'no contact'})` });

// Start a new application. Pass `student` to fix the student (as on the student profile);
// otherwise a searchable student picker is shown.
export default function ApplicationFormModal({ open, student, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [studentOptions, setStudentOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);
  const needsPicker = !student;

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || !needsPicker) return undefined;
    let cancelled = false;
    listStudents({ limit: 10, sort: '-createdAt' })
      .then((res) => {
        if (!cancelled) setStudentOptions(res.data.map(toStudentOption));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, needsPicker]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const searchStudents = (text) => {
    clearTimeout(timer.current);
    if (!text.trim()) return;
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await listStudents({ q: text.trim(), limit: 10, sort: 'fullName' });
        setStudentOptions(res.data.map(toStudentOption));
      } catch {
        setStudentOptions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      studentId: student ? student.id : values.studentId,
      programIntakeId: values.programIntakeId,
    };
    if (values.deadline) payload.deadline = values.deadline.format('YYYY-MM-DD');
    if (values.notes?.trim()) payload.notes = values.notes.trim();

    setSaving(true);
    setError(null);
    try {
      onSaved(await createApplication(payload));
    } catch (err) {
      if (err.details?.length) form.setFields(err.details.map((d) => ({ name: d.field, errors: [d.message] })));
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New application"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Create application"
      confirmLoading={saving}
      width={560}
      destroyOnClose
      maskClosable={false}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" requiredMark={false}>
        {student && (
          <Form.Item label="Student">
            <Typography.Text>{student.fullName}</Typography.Text>
          </Form.Item>
        )}
        {needsPicker && (
          <Form.Item name="studentId" label="Student" rules={[{ required: true, message: 'Choose a student.' }]}>
            <Select
              showSearch
              filterOption={false}
              onSearch={searchStudents}
              loading={searching}
              options={studentOptions}
              placeholder="Search by name, phone or email"
              notFoundContent={searching ? 'Searching...' : 'No students found'}
            />
          </Form.Item>
        )}

        <CascadeFields
          form={form}
          upTo="intake"
          onIntakeChange={(intake) => {
            // The deadline starts as the intake's deadline; it can still be changed.
            form.setFieldValue('deadline', intake?.applicationDeadline ? dayjs(intake.applicationDeadline) : undefined);
          }}
        />

        <Form.Item name="deadline" label="Deadline" extra="Filled in from the intake. Change it if the university gave a different date.">
          <DatePicker style={{ width: '100%' }} format="D MMM YYYY" />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
