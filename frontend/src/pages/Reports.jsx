import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, message, Modal, Select, Space, Table, Tabs, Tag } from "antd";
import dayjs from "dayjs";
import api, { errMsg } from "../api";
import { useAuth } from "../auth";
import FieldInputs, { toFormValues, toPayload } from "../components/FieldInputs";
import PageHero from "../components/PageHero";

const fmt = (d) => d.format("YYYY-MM-DD");

function EntryModal({ editing, fields, branches, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    form.resetFields();
    if (editing.mode === "edit") form.setFieldsValue(toFormValues(editing.row.values, fields));
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const onOk = async () => {
    const { branch_id, entry_date, ...rest } = await form.validateFields();
    setSaving(true);
    try {
      if (editing.mode === "edit") {
        await api.put(`/admin/entries/${editing.row.id}`, { values: toPayload(rest) });
      } else {
        await api.post("/admin/entries", { branch_id, entry_date: fmt(entry_date), values: toPayload(rest) });
      }
      message.success("Saved");
      onSaved();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const title = editing?.mode === "edit"
    ? `Edit ${editing.row.branch_code}: ${dayjs(editing.row.entry_date).format("DD-MM-YYYY")}`
    : "Add Missing Entry";

  return (
    <Modal open={!!editing} title={title} onCancel={onClose} onOk={onOk} confirmLoading={saving} forceRender>
      <Form form={form} layout="vertical">
        {editing?.mode === "create" && (
          <>
            <Form.Item name="branch_id" label="Branch" rules={[{ required: true }]}>
              <Select options={branches.map((b) => ({ value: b.id, label: `${b.code}: ${b.name}` }))} />
            </Form.Item>
            <Form.Item name="entry_date" label="Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY"
                disabledDate={(d) => d.isAfter(dayjs(), "day")} />
            </Form.Item>
          </>
        )}
        <FieldInputs fields={fields} />
      </Form>
    </Modal>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const [branches, setBranches] = useState([]);
  const [activeFields, setActiveFields] = useState([]);
  const [range, setRange] = useState([dayjs().subtract(6, "day"), dayjs()]);
  const [branchId, setBranchId] = useState();
  const [data, setData] = useState({ fields: [], rows: [] });
  const [loading, setLoading] = useState(false);
  const [pendingDate, setPendingDate] = useState(dayjs());
  const [pending, setPending] = useState([]);
  const [editing, setEditing] = useState(null);

  const params = () => ({ date_from: fmt(range[0]), date_to: fmt(range[1]), branch_id: branchId });

  const search = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/entries", { params: params() });
      setData(res.data);
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const exportXlsx = async () => {
    try {
      const p = params();
      const res = await api.get("/reports/export", { params: p, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${p.date_from}_${p.date_to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      message.error("Export failed");
    }
  };

  useEffect(() => {
    api.get("/me/branches").then((r) => setBranches(r.data.branches)).catch((e) => message.error(errMsg(e)));
    api.get("/fields").then((r) => setActiveFields(r.data)).catch((e) => message.error(errMsg(e)));
    search();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get("/reports/pending", { params: { on_date: fmt(pendingDate) } })
      .then((r) => setPending(r.data))
      .catch((e) => message.error(errMsg(e)));
  }, [pendingDate]);

  const columns = [
    { key: "date", title: "Date", dataIndex: "entry_date", render: (d) => dayjs(d).format("DD-MM-YYYY") },
    { key: "branch", title: "Branch", render: (_, r) => `${r.branch_code}: ${r.branch_name}` },
    ...data.fields.map((f) => ({
      key: `f-${f.id}`,
      title: f.label + (f.is_active ? "" : " (inactive)"),
      render: (_, r) => r.values[f.id] ?? "-",
    })),
    { key: "by", title: "Submitted By", dataIndex: "submitted_by" },
    { key: "at", title: "Submitted At", dataIndex: "submitted_at",
      render: (d) => dayjs(d).format("DD-MM-YYYY hh:mm A") },
    ...(isAdmin ? [{
      key: "action", title: "Action",
      render: (_, r) => <Button size="small" onClick={() => setEditing({ mode: "edit", row: r })}>Edit</Button>,
    }] : []),
  ];

  const branchOptions = branches.map((b) => ({ value: b.id, label: `${b.code}: ${b.name}` }));

  return (
        <>
    <PageHero title="Reports" subtitle="Review entries, export data, and see which branches are pending." />
    <Card>
      <Tabs items={[
        {
          key: "entries", label: "Entries",
          children: (
            <>
              <Space wrap style={{ marginBottom: 16 }}>
                <DatePicker.RangePicker value={range} onChange={(v) => v && setRange(v)}
                  allowClear={false} format="DD-MM-YYYY" />
                <Select allowClear placeholder="All branches" style={{ width: 260 }}
                  value={branchId} onChange={setBranchId} options={branchOptions} />
                <Button type="primary" onClick={search}>Search</Button>
                <Button onClick={exportXlsx}>Export Excel</Button>
                {isAdmin && <Button onClick={() => setEditing({ mode: "create" })}>Add Missing Entry</Button>}
              </Space>
              <Table rowKey="id" size="small" loading={loading} columns={columns}
                dataSource={data.rows} scroll={{ x: true }} />
            </>
          ),
        },
        {
          key: "pending", label: "Pending Branches",
          children: (
            <>
              <Space style={{ marginBottom: 16 }}>
                <span>Date:</span>
                <DatePicker value={pendingDate} onChange={(v) => v && setPendingDate(v)} allowClear={false}
                  format="DD-MM-YYYY" disabledDate={(d) => d.isAfter(dayjs(), "day")} />
              </Space>
              <Table rowKey="id" size="small" dataSource={pending}
                locale={{ emptyText: "All branches have submitted" }}
                columns={[
                  { key: "code", title: "Code", dataIndex: "code" },
                  { key: "name", title: "Branch", dataIndex: "name" },
                  { key: "status", title: "Status", render: () => <Tag color="red">Not submitted</Tag> },
                ]} />
            </>
          ),
        },
      ]} />
      {isAdmin && (
        <EntryModal editing={editing} fields={activeFields} branches={branches}
                   onClose={() => setEditing(null)} onSaved={() => { setEditing(null); search(); }} />
      )}
    </Card>
    </>
  );
}