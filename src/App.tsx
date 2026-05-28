import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { DemoLayout } from "./pages/demo/DemoLayout";
import { DemoPage } from "./pages/demo/DemoPage";
import { DocsLayout } from "./pages/docs/DocsLayout";
import { DocsPage } from "./pages/docs/DocsPage";
import { EditorLayout } from "./pages/editor/EditorLayout";
import "./App.css";

const EditorPage = lazy(() =>
  import("./pages/editor/EditorPage").then(({ EditorPage }) => ({
    default: EditorPage,
  })),
);

function EditorRoute() {
  return (
    <Suspense fallback={<div className="route-loading">불러오는 중...</div>}>
      <EditorPage />
    </Suspense>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DocsLayout />}>
        <Route index element={<DocsPage />} />
      </Route>

      <Route path="/demo" element={<DemoLayout />}>
        <Route index element={<DemoPage />} />
      </Route>

      <Route path="/editor" element={<EditorLayout />}>
        <Route index element={<EditorRoute />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
