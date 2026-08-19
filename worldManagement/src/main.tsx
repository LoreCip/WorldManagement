import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

import { SettingsProvider } from "./context/SettingsContext";
import { LocalizationProvider } from "./context/LocalizationContext";
import { ToastProvider } from "./components/common/Toast";
import { ConfirmProvider } from "./components/common/ConfirmDialog";
import { UpdateNotification } from "./components/common/UpdateNotification";
import { injectThemeCssVariables } from "./components/theme/theme";

injectThemeCssVariables();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <LocalizationProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
            <UpdateNotification />
          </ConfirmProvider>
        </ToastProvider>
      </LocalizationProvider>
    </SettingsProvider>
  </React.StrictMode>,
);
