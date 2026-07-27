import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { MapsProvider } from "./context/MapsContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MapsProvider>
      <App />
    </MapsProvider>
  </React.StrictMode>
);
