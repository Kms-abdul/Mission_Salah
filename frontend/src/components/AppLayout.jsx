import { Button, Layout, Menu } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const ROLE_LABELS = { ENTRY: "Data entry", REPORT: "Reports", ADMIN: "Administrator" };

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const items = [];
  if (user.role === "ENTRY") items.push({ key: "/entry", label: "Data Entry" });
  if (["REPORT", "ADMIN"].includes(user.role)) items.push({ key: "/reports", label: "Reports" });
  if (user.role === "ADMIN") items.push({ key: "/admin", label: "Admin" });

  return (
    <Layout className="app-layout">
      <Layout.Header className="app-header">
        <div className="app-brand">
          <strong>Mission Fajr</strong>
          {/* <span>Branch Daily Entry</span> */}
        </div>
        <Menu className="app-menu" theme="dark" mode="horizontal" selectedKeys={[loc.pathname]}
          items={items} onClick={(e) => nav(e.key)} />
        <div className="app-user">
          <div className="app-user__text">
            <strong>{user.full_name}</strong>
            <span>{ROLE_LABELS[user.role] ?? user.role}</span>
          </div>
          <Button className="app-logout" onClick={() => { logout(); nav("/login"); }}>Log out</Button>
        </div>
      </Layout.Header>
      <div className="app-bar" />
      <Layout.Content className="app-content">{children}</Layout.Content>
    </Layout>
  );
}