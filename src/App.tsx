import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { DemoLayout } from "./pages/demo/DemoLayout";
import { DemoPage } from "./pages/demo/DemoPage";
import { DocsIntegrationPage } from "./pages/docs/DocsIntegrationPage";
import { DocsLayout } from "./pages/docs/DocsLayout";
import { DocsScreenPage } from "./pages/docs/DocsScreenPage";
import { DocsStartPage } from "./pages/docs/DocsStartPage";
import { ScrollToTop } from "./shared/navigation/ScrollToTop";
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

function EditorRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-extrabold text-ink-soft">
          불러오는 중...
        </div>
      }
    >
      <EditorPage />
    </Suspense>
  );
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<DocsLayout />}>
          <Route index element={<DocsStartPage />} />
          <Route path="integration" element={<DocsIntegrationPage />} />
          <Route path="screen" element={<DocsScreenPage />} />
        </Route>

        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<DemoPage />} />
        </Route>

        <Route
          path="/editor"
          element={
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center font-extrabold text-ink-soft">
                  불러오는 중...
                </div>
              }
            >
              <EditorLayout />
            </Suspense>
          }
        >
          <Route index element={<EditorRoute />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
