import { I18nextProvider } from "react-i18next";
import { createI18n } from "./shared/i18n/i18n";
import { getLocale } from "./shared/i18n/locale";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { App } from "./App";
import { AppProviders } from "./app/AppProviders";

export function render(location = "/") {
  return renderToString(
    <I18nextProvider i18n={createI18n(getLocale(location))}>
      <AppProviders>
        <StaticRouter location={location}>
          <App />
        </StaticRouter>
      </AppProviders>
    </I18nextProvider>,
  );
}

export { getPageMetadata } from "./shared/i18n/pageMetadata";
