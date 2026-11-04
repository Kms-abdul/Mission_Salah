import { Col, Form, Input, InputNumber, Row } from "antd";

export const FIELD_CATEGORIES = [
  { value: "STUDENTS", label: "Students", header: "#D6ECF5", body: "#F6FBFD", accent: "#8DBFD6" },
  { value: "TEACHING", label: "Teaching Staff", header: "#FBE7BF", body: "#FFFBF2", accent: "#D9B568" },
  { value: "NON_TEACHING", label: "Non-Teaching Staff", header: "#D8F0E0", body: "#F6FCF8", accent: "#86C49B" },
  { value: "OTHER", label: "Other", header: "#E6EBEF", body: "#F8FAFB", accent: "#B7C3CC" },
];

export default function FieldInputs({ fields, disabled = false }) {
  return (
    <>
      {FIELD_CATEGORIES.map((category) => {
        const group = fields.filter((f) => (f.category ?? "OTHER") === category.value);
        if (!group.length) return null;

        return (
          <section key={category.value} className="app-field-group"
            style={{
              "--group-header": category.header,
              "--group-body": category.body,
              "--group-accent": category.accent,
            }}>
            <div className="app-field-group__title">{category.label}</div>
            <div className="app-field-group__body">
              <Row gutter={16}>
                {group.map((f) => (
                  <Col key={f.id} xs={24} sm={f.field_type === "TEXT" ? 24 : 12}>
                    <Form.Item name={String(f.id)} label={f.label}
                      rules={f.is_required ? [{ required: true, message: `${f.label} is required` }] : []}>
                      {f.field_type === "TEXT" ? (
                        <Input.TextArea rows={2} maxLength={500} disabled={disabled} />
                      ) : (
                        <InputNumber size="large" controls={false} style={{ width: "100%" }} disabled={disabled}
                          precision={f.field_type === "INTEGER" ? 0 : 2} />
                      )}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </div>
          </section>
        );
      })}
    </>
  );
}

export const toPayload = (vals) =>
  Object.fromEntries(
    Object.entries(vals).map(([k, v]) => [k, v === undefined || v === null || v === "" ? null : String(v)])
  );

export const toFormValues = (values, fields) =>
  Object.fromEntries(
    fields.map((f) => {
      const v = values?.[f.id];
      return [String(f.id), v == null ? undefined : f.field_type === "TEXT" ? v : Number(v)];
    })
  );