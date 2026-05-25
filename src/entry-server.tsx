import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { App } from "./App";
import { AppProviders } from "./app/AppProviders";

export function render() {
  return renderToString(
    <AppProviders>
      <StaticRouter location="/">
        <App />
      </StaticRouter>
    </AppProviders>,
  );
}
