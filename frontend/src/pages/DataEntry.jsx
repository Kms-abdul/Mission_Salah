import { useEffect, useState } from "react";
import { Button, Card, Form, message, Modal, Select, Spin, Tag } from "antd";
import dayjs from "dayjs";
import api, { errMsg } from "../api";
import FieldInputs, { toFormValues, toPayload } from "../components/FieldInputs";
import PageHero from "../components/PageHero";

export default function DataEntry() {
  const [info, setInfo] = useState(null);
  const [fields, setFields] = useState([]);
  const [selected, setSelected] = useState(null);
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const [b, f] = await Promise.all([api.get("/me/branches"), api.get("/fields")]);
    setInfo(b.data);
    setFields(f.data);
    return { branches: b.data.branches, fields: f.data };
  };

  const openBranch = async (branch, fieldList = fields) => {
    setSelected(branch);
    setExisting(null);
    form.resetFields();
    try {
      const { data } = await api.get(`/entries/today/${branch.id}`);
      if (data.submitted) {
        setExisting(data);
        form.setFieldsValue(toFormValues(data.values, fieldList));
      }
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  useEffect(() => {
    load()
      .then((result) => {
        const first = result.branches.find((b) => !b.submitted) ?? result.branches[0];
        if (first) openBranch(first, result.fields);
      })
      .catch((e) => message.error(errMsg(e)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (vals) => {
    Modal.confirm({
      title: `Submit today's data for ${selected.code}?`,
      content: "Once submitted, it cannot be changed. Only an admin can correct it.",
      okText: "Submit",
      onOk: async () => {
        setSaving(true);
        try {
          await api.post("/entries", { branch_id: selected.id, values: toPayload(vals) });
          message.success("Submitted successfully");
        } catch (e) {
          message.error(errMsg(e));
        } finally {
          setSaving(false);
          const result = await load().catch(() => null);
          await openBranch(selected, result?.fields ?? fields);
        }
      },
    });
  };

  if (!info) {
    return <div className="app-state"><Spin size="large" /></div>;
  }

  const total = info.branches.length;
  const submittedCount = info.branches.filter((b) => b.submitted).length;
  const options = info.branches.map((b) => ({
    value: b.id,
    search: `${b.code} ${b.name}`.toLowerCase(),
    label: (
      <span className="app-branch-option">
        <span>{b.code}: {b.name}</span>
        <Tag color={b.submitted ? "green" : "orange"} style={{ marginInlineEnd: 0 }}>
          {b.submitted ? "Submitted" : "Pending"}
        </Tag>
      </span>
    ),
  }));

  return (
    <>
      <PageHero title="Today's entry" subtitle={dayjs(info.date).format("dddd, D MMMM YYYY")}>
        {total > 0 && (
          <>
            <label className="app-branch-label" htmlFor="entry-branch">Branch</label>
            {total === 1 ? (
              <div className="app-branch-single">{info.branches[0].code}: {info.branches[0].name}</div>
            ) : (
              <Select id="entry-branch" className="app-branch-select" size="large" showSearch
                placeholder="Select a branch" value={selected?.id} options={options}
                filterOption={(input, option) => option.search.includes(input.toLowerCase())}
                onChange={(id) => openBranch(info.branches.find((b) => b.id === id))} />
            )}
            <div className="app-branch-status">{submittedCount} of {total} submitted today</div>
          </>
        )}
      </PageHero>

      {total === 0 ? (
        <Card>No branches are assigned to you. Contact your admin.</Card>
      ) : selected ? (
        <Card title={selected.name}
          extra={existing && <Tag color="green">Submitted at {dayjs(existing.submitted_at).format("hh:mm A")}</Tag>}>
          <Form form={form} layout="vertical" onFinish={submit}>
            <FieldInputs fields={fields} disabled={!!existing} />
            {!existing && (
              <div className="app-form-actions">
                <Button className="app-submit" type="primary" htmlType="submit" loading={saving}>
                  Submit today's data
                </Button>
              </div>
            )}
          </Form>
        </Card>
      ) : (
        <div className="app-state"><Spin size="large" /></div>
      )}
    </>
  );
}