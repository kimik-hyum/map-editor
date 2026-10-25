import React from "react";
import { I18nextProvider } from "react-i18next";
import { createI18n } from "./shared/i18n/i18n";
import { getLocale } from "./shared/i18n/locale";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { AppProviders } from "./app/AppProviders";
import "./index.css";

const app = (
  <React.StrictMode>
    <I18nextProvider i18n={createI18n(getLocale(window.location.pathname))}>
      <AppProviders>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppProviders>
    </I18nextProvider>
  </React.StrictMode>
);

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

if (root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
