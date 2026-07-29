import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { MapsProvider } from "./context/MapsContext";
import { SettingsProvider } from "./context/SettingsContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <MapsProvider>
        <App />
      </MapsProvider>
    </SettingsProvider>
  </React.StrictMode>
);
