import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSampleEditorScene } from "../fixtures/sampleEditorScene";
import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";
import { LocaleContext } from "@/shared/i18n/localeContext";
import type { Locale } from "@/shared/i18n/locale";
import { createEditorHost, type EditorHostStatus } from "./createEditorHost";

export type { EditorHostStatus } from "./createEditorHost";

type ExampleState = {
  scene: EditorSceneInput;
  status: EditorHostStatus;
  errorMessage: string | null;
  submittedScene: EditorSceneInput | null;
  hasEdits: boolean;
};

// 언어별 예제와 결과를 보관하고, 열린 편집기의 회차는 시작한 언어에 귀속합니다.
export function useEditorHost(getInitialScene = getSampleEditorScene) {
  const locale = useContext(LocaleContext) ?? "ko";
  const initialState = (language: Locale): ExampleState => ({
    scene: structuredClone(getInitialScene(language)),
    status: "idle",
    errorMessage: null,
    submittedScene: null,
    hasEdits: false,
  });
  const [states, setStates] = useState(() => ({
    ko: initialState("ko"),
    en: initialState("en"),
  }));
  const statesRef = useRef(states);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const sessionLocaleRef = useRef(locale);
  const hostRef = useRef<ReturnType<typeof createEditorHost> | null>(null);
  const update = useCallback((language: Locale, patch: Partial<ExampleState>) => {
    const next = {
      ...statesRef.current,
      [language]: { ...statesRef.current[language], ...patch },
    };
    statesRef.current = next;
    setStates(next);
  }, []);

  useEffect(() => {
    const host = createEditorHost({
      getScene: () => {
        sessionLocaleRef.current = localeRef.current;
        return statesRef.current[localeRef.current].scene;
      },
      onOpen() {
        sessionLocaleRef.current = localeRef.current;
        update(sessionLocaleRef.current, { submittedScene: null });
      },
      onStatus: (status) => update(sessionLocaleRef.current, { status }),
      onError: (errorMessage) => update(sessionLocaleRef.current, { errorMessage }),
      onSubmit(nextScene) {
        // 서비스 페이지의 언어가 바뀌어도 편집을 시작한 언어의 결과로 보관합니다.
        update(sessionLocaleRef.current, {
          scene: nextScene,
          submittedScene: nextScene,
          hasEdits: true,
        });
      },
    });
    hostRef.current = host;
    return () => {
      hostRef.current = null;
      host.dispose();
    };
  }, [update]);

  const openEditor = useCallback(() => hostRef.current?.open(), []);
  const resetScene = () => update(locale, initialState(locale));
  return { ...states[locale], openEditor, resetScene };
}
