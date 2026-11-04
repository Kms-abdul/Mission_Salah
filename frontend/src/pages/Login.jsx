import { useState } from "react";
import { Button, Form, Input, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { errMsg } from "../api";
import { homeFor, useAuth } from "../auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ username, password }) => {
    setLoading(true);
    try {
      const u = await login(username, password);
      nav(homeFor(u.role), { replace: true });
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-login">
      <section className="app-login__card">
        <h1>Mission Fajr</h1>
        <p>Log in with your staff account</p>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="User ID" rules={[{ required: true }]}>
            <Input size="large" autoFocus autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" size="large" htmlType="submit" block loading={loading}>Log in</Button>
          <div className="app-login__back">
            <Link to="/">Back to Mission Fajr</Link>
          </div>
        </Form>
      </section>
    </main>
  );
}