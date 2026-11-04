import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, useAuth } from "./auth";
import AppLayout from "./components/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import DataEntry from "./pages/DataEntry";
import Reports from "./pages/Reports";
import AdminPage from "./pages/AdminPage";

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
      <Route path="/entry" element={<Protected roles={["ENTRY"]}><DataEntry /></Protected>} />
      <Route path="/reports" element={<Protected roles={["REPORT", "ADMIN"]}><Reports /></Protected>} />
      <Route path="/admin" element={<Protected roles={["ADMIN"]}><AdminPage /></Protected>} />
            <Route path="/" element={<Landing />} />
      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : "/"} replace />} />
    </Routes>
  );
}