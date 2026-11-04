import { createContext, useContext, useState } from "react";
import api from "./api";

const AuthContext = createContext(null);

export const homeFor = (role) =>
  role === "ENTRY" ? "/entry" : role === "REPORT" ? "/reports" : "/admin";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    const u = { role: data.role, full_name: data.full_name };
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);