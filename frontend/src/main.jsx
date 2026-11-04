import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import "antd/dist/reset.css";
import "./AppTheme.css";
import App from "./App";
import { AuthProvider } from "./auth";

const isLargeScreen = window.innerWidth >= 1500;

const theme = {
  token: {
    colorPrimary: "#0B2F52",
    colorLink: "#0B5A8A",
    borderRadius: 10,
    fontSize: isLargeScreen ? 16 : 14,
    controlHeight: isLargeScreen ? 42 : 32,
    fontFamily: '"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  components: {
    Layout: { headerBg: "#082440", bodyBg: "#F3F7F9" },
    Menu: {
      darkItemBg: "transparent",
      darkItemColor: "#DCE8EF",
      darkItemHoverColor: "#F4C766",
      darkItemSelectedBg: "transparent",
      darkItemSelectedColor: "#F4C766",
    },
    Table: { headerBg: "#0B2F52", headerColor: "#FFFFFF" },
    Tabs: { inkBarColor: "#946207", itemSelectedColor: "#0B2F52", itemHoverColor: "#946207" },
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);