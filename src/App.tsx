import { Navigate, Route, Routes } from "react-router";
import { DocsPage } from "./pages/docs/DocsPage";
import { DemoPage } from "./pages/demo/DemoPage";
import { EditorPage } from "./pages/editor/EditorPage";
import { AppNavigation } from "./shared/navigation/AppNavigation";
import "./App.css";

export function App() {
  return (
    <>
      <AppNavigation />
      <Routes>
        <Route path="/" element={<DocsPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
