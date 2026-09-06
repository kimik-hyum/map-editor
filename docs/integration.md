# 부모 서비스 연동

웹 `/integration`은 이 계약과 [실행 예제](../src/pages/docs/content/examples)를 함께 제공합니다. API의 실제 입력 기준은 [editorSceneSchema.ts](../src/pages/editor/messaging/editorSceneSchema.ts), 반환 기준은 [serializeSceneOutput.ts](../src/pages/editor/messaging/serializeSceneOutput.ts)입니다.

## 최소 흐름

1. 부모에서 message 수신기를 등록합니다.
2. 사용자 클릭에서 `window.open(editorUrl)`로 새 창을 엽니다. `noopener`·`noreferrer`로 opener를 끊지 않습니다.
3. 내가 연 팝업의 READY에 INIT으로 응답합니다. INIT에는 비어 있지 않은 sessionId와 v2 scene을 넣습니다.
4. SUBMIT/CANCEL의 source·origin·sessionId·메시지 구조를 검증합니다.
5. SUBMIT은 부모 초안 교체 후 필요한 저장 API를 호출합니다. CANCEL이면 기존 데이터를 유지합니다. 팝업은 부모가 닫습니다.

| type              | 방향          | 데이터                                           |
| ----------------- | ------------- | ------------------------------------------------ |
| MAP_EDITOR_READY  | 에디터 → 부모 | 준비 신호만                                      |
| MAP_EDITOR_INIT   | 부모 → 에디터 | sessionId, scene                                 |
| MAP_EDITOR_SUBMIT | 에디터 → 부모 | 동일 sessionId, 전체 scene                       |
| MAP_EDITOR_CANCEL | 에디터 → 부모 | 동일 sessionId, scene 없음                       |
| MAP_EDITOR_ERROR  | 에디터 → 부모 | message, 선택적 issues; sessionId가 없을 수 있음 |

**INIT은 상태 업데이트가 아닙니다.** 새 INIT은 편집과 이력을 초기화합니다. 중간 MAP_EDITOR_CHANGE는 보내지 않습니다. 부모는 토큰을 보내거나 에디터의 Google 세션을 관리할 필요가 없습니다.

## scene v2

```ts
{
  version: 2,
  features: [{
    id: "area-1",
    name: "편집 권역",
    geometry: {
      type: "Polygon",
      coordinates: [[[127, 37.5], [127.01, 37.5], [127.01, 37.51], [127, 37.5]]]
    }
  }]
}
```

- 필수: version, features, 도형별 geometry. GeoJSON FeatureCollection 자체를 보내지 않습니다.
- 좌표는 [경도, 위도]이며 각각 -180~180, -90~90 범위입니다.
- Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon을 지원합니다.
- Polygon은 서로 다른 정점 3개 이상이 필요합니다. 열린 링은 입력 정규화가 닫지만 호스트 예제처럼 닫힌 링을 권장합니다.
- 도형의 id·name·locked·visible·themeToken·properties와 scene의 id·name·viewport는 선택입니다. id를 제공하면 중복되지 않아야 합니다.
- 배열 뒤쪽이 지도 위쪽입니다. SUBMIT도 이 순서를 유지하며 내부 layers·선택·히스토리·인증 토큰은 포함하지 않습니다.
- locked는 UI에서 해제 가능한 잠금이며 서버 권한이 아닙니다. 숨긴 도형도 결과에 포함됩니다.

Point/Path만 있는 입력도 완료할 수 있습니다. ‘반환할 폴리곤이 없습니다’는 안내 문구이며 저장 차단 조건이 아닙니다.

## 예제 사용

`npm install zod` 후 다음 네 파일을 같은 폴더에 두세요. 예제는 프로젝트 타입 검사와 테스트 대상이기도 합니다.

| 파일                                                                                        | 책임                                 |
| ------------------------------------------------------------------------------------------- | ------------------------------------ |
| [editor-contract.example.ts](../src/pages/docs/content/examples/editor-contract.example.ts) | 외부 완료 메시지의 구조·좌표 검증    |
| [input-scene.example.ts](../src/pages/docs/content/examples/input-scene.example.ts)         | Polygon + Point 입력                 |
| [map-editor-host.example.ts](../src/pages/docs/content/examples/map-editor-host.example.ts) | 팝업·source/origin/session 검증·종료 |
| [parent-page.example.ts](../src/pages/docs/content/examples/parent-page.example.ts)         | 부모 버튼·지도·오류 UI 연결          |

`bindMapEditor`에 실제 `editorUrl`, 버튼, 지도 반영 콜백과 오류 표시 콜백을 전달하고 반환된 정리 함수를 unmount 시 실행합니다. 입력 스냅샷은 창을 열 때 고정하며 중복 클릭은 기존 팝업에 포커스합니다.

예제는 저장 API를 호출하지 않으며, 결과 검증 스키마도 업무별 면적·위치·저장 권한을 대신하지 않습니다. 부모 서버가 반드시 최종 검증해야 합니다.

## 보안·문제 해결

- `event.origin`에서 목적지를 추론하지 않습니다. 배포할 editorUrl로 계산한 origin만 사용합니다.
- 데이터가 담긴 postMessage의 targetOrigin에 `"*"`를 쓰지 않습니다. 에디터의 데이터 없는 최초 READY만 예외입니다.
- source·origin은 모든 메시지에서, sessionId는 SUBMIT/CANCEL에서 검증합니다. sessionId는 로그인 자격 증명이 아닙니다.
- 새 창이 안 뜨면 팝업 차단, READY가 없으면 수신기 등록 순서와 opener 유지 여부를 확인합니다.
- ERRORS는 unknown 입력처럼 취급해 안전하게 표시합니다. INIT 오류는 좌표·중복 ID·v2 구조를 먼저 확인합니다.
- 경계 로그인 callback과 함수 origin 설정은 [인증 문서](supabase-region-api.md)를 참고하세요.
