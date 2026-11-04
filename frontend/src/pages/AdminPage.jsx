import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, message, Modal, Select, Switch, Table, Tabs, Tag } from "antd";
import dayjs from "dayjs";
import api, { errMsg } from "../api";
import { FIELD_CATEGORIES } from "../components/FieldInputs";
import PageHero from "../components/PageHero";

const activeTag = (v) => (v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>);
const ROLE_COLORS = { ADMIN: "red", ENTRY: "blue", REPORT: "purple" };

function CrudTab({ title, endpoint, columns, renderForm, defaults }) {
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(() => {
    api.get(endpoint).then((r) => setRows(r.data)).catch((e) => message.error(errMsg(e)));
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const open = (row) => {
    setEdit(row ?? {});
    form.resetFields();
    form.setFieldsValue(row ?? defaults);
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (edit.id) await api.put(`${endpoint}/${edit.id}`, values);
      else await api.post(endpoint, values);
      message.success("Saved");
      setEdit(null);
      load();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="primary" onClick={() => open(null)} style={{ marginBottom: 12 }}>Add {title}</Button>
      <Table rowKey="id" size="small" dataSource={rows}
        columns={[...columns, {
          key: "action", title: "Action",
          render: (_, r) => <Button size="small" onClick={() => open(r)}>Edit</Button>,
        }]} />
      <Modal open={!!edit} title={`${edit?.id ? "Edit" : "Add"} ${title}`} onCancel={() => setEdit(null)}
        onOk={save} confirmLoading={saving} forceRender>
        <Form form={form} layout="vertical">{renderForm(!!edit?.id)}</Form>
      </Modal>
    </>
  );
}

function UsersTab() {
  const [branches, setBranches] = useState([]);
  useEffect(() => {
    api.get("/admin/branches").then((r) => setBranches(r.data)).catch((e) => message.error(errMsg(e)));
  }, []);
  const codeOf = (id) => branches.find((b) => b.id === id)?.code ?? id;

  return (
    <CrudTab title="User" endpoint="/admin/users"
      defaults={{ role: "ENTRY", is_active: true, branch_ids: [] }}
      columns={[
        { key: "u", title: "User ID", dataIndex: "username" },
        { key: "n", title: "Name", dataIndex: "full_name" },
        { key: "r", title: "Role", dataIndex: "role", render: (r) => <Tag color={ROLE_COLORS[r]}>{r}</Tag> },
        { key: "b", title: "Branches", dataIndex: "branch_ids",
          render: (ids, r) => (r.role === "ADMIN" ? "All" : ids.map(codeOf).join(", ") || "-") },
        { key: "s", title: "Status", dataIndex: "is_active", render: activeTag },
      ]}
      renderForm={(isEdit) => (
        <>
          <Form.Item name="username" label="User ID" rules={[{ required: true, min: 3 }]}>
            <Input disabled={isEdit} />
          </Form.Item>
          <Form.Item name="password" label={isEdit ? "New Password (leave blank to keep current)" : "Password"}
            rules={isEdit ? [{ min: 6 }] : [{ required: true, min: 6 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="full_name" label="Full Name"><Input /></Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={["ENTRY", "REPORT", "ADMIN"].map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="branch_ids" label="Assigned Branches (ignored for ADMIN)">
            <Select mode="multiple" options={branches.map((b) => ({ value: b.id, label: `${b.code}: ${b.name}` }))} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>
      )}
    />
  );
}

function BranchesTab() {
  return (
    <CrudTab title="Branch" endpoint="/admin/branches" defaults={{ is_active: true }}
      columns={[
        { key: "c", title: "Code", dataIndex: "code" },
        { key: "n", title: "Name", dataIndex: "name" },
        { key: "s", title: "Status", dataIndex: "is_active", render: activeTag },
      ]}
      renderForm={() => (
        <>
          <Form.Item name="code" label="Branch Code" rules={[{ required: true, max: 20 }]}><Input /></Form.Item>
          <Form.Item name="name" label="Branch Name" rules={[{ required: true, max: 100 }]}><Input /></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>
      )}
    />
  );
}

function FieldsTab() {
  return (
    <CrudTab title="Field" endpoint="/admin/fields"
            defaults={{ category: "OTHER", field_type: "INTEGER", is_required: true, sort_order: 0, is_active: true }}
      columns={[
        { key: "o", title: "Order", dataIndex: "sort_order" },
      { key: "l", title: "Label", dataIndex: "label" },
        { key: "c", title: "Category", dataIndex: "category",
          render: (v) => FIELD_CATEGORIES.find((c) => c.value === v)?.label ?? v },
        { key: "t", title: "Type", dataIndex: "field_type" },
        { key: "r", title: "Required", dataIndex: "is_required", render: (v) => (v ? "Yes" : "No") },
        { key: "s", title: "Status", dataIndex: "is_active", render: activeTag },
      ]}
      renderForm={() => (
        <>
                    <Form.Item name="label" label="Label" rules={[{ required: true, max: 100 }]}><Input /></Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select options={FIELD_CATEGORIES.map(({ value, label }) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="field_type" label="Type" rules={[{ required: true }]}>
            <Select options={[
              { value: "INTEGER", label: "Whole number" },
              { value: "DECIMAL", label: "Decimal (amount)" },
              { value: "TEXT", label: "Text" },
            ]} />
          </Form.Item>
          <Form.Item name="sort_order" label="Display Order"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="is_required" label="Mandatory" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </>
      )}
    />
  );
}

function AuditTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const load = () => {
    setLoading(true);
    api.get("/admin/audit").then((r) => setRows(r.data))
      .catch((e) => message.error(errMsg(e))).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const json = (v) => (v ? <code style={{ fontSize: 11, wordBreak: "break-all" }}>{JSON.stringify(v)}</code> : "-");

  return (
    <>
      <Button onClick={load} style={{ marginBottom: 12 }}>Refresh</Button>
      <Table rowKey="id" size="small" loading={loading} dataSource={rows} scroll={{ x: true }}
        columns={[
          { key: "t", title: "Time", dataIndex: "created_at", render: (d) => dayjs(d).format("DD-MM-YYYY hh:mm A") },
          { key: "u", title: "User", dataIndex: "username" },
          { key: "a", title: "Action", dataIndex: "action" },
          { key: "e", title: "Entity", render: (_, r) => `${r.entity} #${r.entity_id ?? ""}` },
          { key: "o", title: "Old", dataIndex: "old_value", render: json },
          { key: "n", title: "New", dataIndex: "new_value", render: json },
        ]} />
    </>
  );
}

export default function AdminPage() {
  return (
      <>
    <PageHero title="Administration" subtitle="Manage users, branches, input fields, and the audit log." />
    <Card>
      <Tabs items={[
        { key: "users", label: "Users", children: <UsersTab /> },
        { key: "branches", label: "Branches", children: <BranchesTab /> },
        { key: "fields", label: "Input Fields", children: <FieldsTab /> },
        { key: "audit", label: "Audit Log", children: <AuditTab /> },
            ]} />
    </Card>
    </>
  );
}