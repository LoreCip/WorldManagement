import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

import { SettingsProvider } from "./context/SettingsContext";
import { LocalizationProvider } from "./context/LocalizationContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <LocalizationProvider>
        <App />
      </LocalizationProvider>
    </SettingsProvider>
  </React.StrictMode>,
);
