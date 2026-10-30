import { Form, Select } from 'antd';
import useCatalogCascade from '../hooks/useCatalogCascade';
import { formatDate, formatIntake } from '../utils/format';

const DEPTH = { university: 1, program: 2, intake: 3 };

// Form fields for the catalog cascade: country > university > program > intake.
// Field names: countryId, universityId, programId, programIntakeId.
// `upTo` is the deepest level to show. Must be rendered inside an antd <Form> and given its instance.
export default function CascadeFields({ form, upTo = 'intake', onIntakeChange }) {
  const depth = DEPTH[upTo];
  const countryId = Form.useWatch('countryId', form);
  const universityId = Form.useWatch('universityId', form);
  const programId = Form.useWatch('programId', form);
  const { countries, universities, programs, intakes, loading } = useCatalogCascade({
    countryId,
    universityId: depth >= 2 ? universityId : undefined,
    programId: depth >= 3 ? programId : undefined,
  });

  const clear = (...names) => form.setFieldsValue(Object.fromEntries(names.map((n) => [n, undefined])));
  const required = (message) => [{ required: true, message }];

  return (
    <>
      <Form.Item name="countryId" label="Country" rules={required('Choose a country.')}>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Select a country"
          options={countries.map((c) => ({ value: c.id, label: c.name }))}
          onChange={() => clear('universityId', 'programId', 'programIntakeId')}
        />
      </Form.Item>
      <Form.Item name="universityId" label="University" rules={required('Choose a university.')}>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder={countryId ? 'Select a university' : 'Choose a country first'}
          disabled={!countryId}
          loading={loading.universities}
          options={universities.map((u) => ({ value: u.id, label: u.name }))}
          onChange={() => clear('programId', 'programIntakeId')}
        />
      </Form.Item>
      {depth >= 2 && (
        <Form.Item name="programId" label="Program" rules={required('Choose a program.')}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={universityId ? 'Select a program' : 'Choose a university first'}
            disabled={!universityId}
            loading={loading.programs}
            options={programs.map((p) => ({ value: p.id, label: p.name }))}
            onChange={() => clear('programIntakeId')}
          />
        </Form.Item>
      )}
      {depth >= 3 && (
        <Form.Item name="programIntakeId" label="Intake" rules={required('Choose an intake.')}>
          <Select
            placeholder={programId ? 'Select an intake' : 'Choose a program first'}
            disabled={!programId}
            loading={loading.intakes}
            options={intakes.map((i) => ({
              value: i.id,
              label: `${formatIntake(i)}${i.applicationDeadline ? ` (deadline ${formatDate(i.applicationDeadline)})` : ''}`,
            }))}
            onChange={(value) => onIntakeChange?.(intakes.find((i) => i.id === value))}
          />
        </Form.Item>
      )}
    </>
  );
}
