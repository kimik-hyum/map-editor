import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AuthCallbackPage } from "@/features/auth";
import { AboutPage } from "./pages/about/AboutPage";
import { DemoLayout } from "./pages/demo/DemoLayout";
import { DemoPage } from "./pages/demo/DemoPage";
import { DocsEditingPage } from "./pages/docs/DocsEditingPage";
import { DocsIntegrationPage } from "./pages/docs/DocsIntegrationPage";
import { DocsLayout } from "./pages/docs/DocsLayout";
import { DocsAuthenticationPage } from "./pages/docs/DocsAuthenticationPage";
import { DocsStartPage } from "./pages/docs/DocsStartPage";
import { DocsSelfHostingPage } from "./pages/docs/DocsSelfHostingPage";
import { DocsBoundaryAdapterPage } from "./pages/docs/DocsBoundaryAdapterPage";
import { ScrollToTop } from "./shared/navigation/ScrollToTop";
import { AuthCallbackRoute } from "./shared/i18n/AuthCallbackRoute";
import { LegacyRedirect } from "./shared/i18n/LegacyRedirect";
import { LocaleRoute } from "./shared/i18n/LocaleRoute";
import { LocaleSync } from "./shared/i18n/LocaleSync";
import { useT } from "./shared/i18n/useT";
import "./App.css";

const EditorLayout = lazy(() =>
  import("./pages/editor/EditorLayout").then(({ EditorLayout }) => ({
    default: EditorLayout,
  })),
);

const EditorPage = lazy(() =>
  import("./pages/editor/EditorPage").then(({ EditorPage }) => ({
    default: EditorPage,
  })),
);

export function App() {
  const t = useT();
  return (
    <>
      <ScrollToTop />
      <LocaleSync />
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackRoute />} />
        <Route path="/:locale" element={<LocaleRoute />}>
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route element={<DocsLayout />}>
            <Route index element={<DocsStartPage />} />
            <Route path="editing" element={<DocsEditingPage />} />
            <Route path="integration" element={<DocsIntegrationPage />} />
            <Route path="authentication" element={<DocsAuthenticationPage />} />
            <Route path="self-hosting" element={<DocsSelfHostingPage />} />
            <Route
              path="self-hosting/boundaries"
              element={<DocsBoundaryAdapterPage />}
            />
            <Route
              path="screen"
              element={<Navigate to="../editing#screen" replace />}
            />
          </Route>

          <Route path="demo" element={<DemoLayout />}>
            <Route index element={<DemoPage />} />
          </Route>

          <Route
            path="editor"
            element={
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center font-extrabold text-ink-soft">
                    {t("불러오는 중...")}
                  </div>
                }
              >
                <EditorLayout />
              </Suspense>
            }
          >
            <Route index element={<EditorPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/ko/" replace />} />
        </Route>
        <Route path="*" element={<LegacyRedirect />} />
      </Routes>
    </>
  );
}
