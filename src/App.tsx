import { Navigate, Route, Routes } from "react-router";
import { DemoLayout } from "./pages/demo/DemoLayout";
import { DemoPage } from "./pages/demo/DemoPage";
import { DocsLayout } from "./pages/docs/DocsLayout";
import { DocsPage } from "./pages/docs/DocsPage";
import { EditorLayout } from "./pages/editor/EditorLayout";
import { EditorPage } from "./pages/editor/EditorPage";
import "./App.css";

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
        <Route index element={<EditorPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
