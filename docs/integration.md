# 연동 인터페이스

배포된 에디터를 자신의 지도에 연결하는 사용자를 위한 문서입니다. **Termia 저장소 복제·내부 코드 수정·경계 데이터 서버나 인증 설정은 필요하지 않습니다.** 입력을 보내면 새 창에 무엇이 보이고, 저장하면 무엇을 받는지 설명합니다. 웹 `/integration`에서 예제를 바로 복사할 수 있습니다. 직접 운영하는 분도 같은 계약을 사용하며 공급자 변경은 [별도 내재화 문서](self-hosting.md)를 따릅니다.

**서비스 페이지**는 편집 버튼이 있는 기존 업무 화면이고, **에디터 창**은 그 버튼으로 여는 Termia입니다. 서비스 지도에서 편집할 폴리곤을 읽어 입력 형식에 맞추고, 에디터가 반환한 결과를 원래 지도에 반영합니다. 지도 라이브러리는 교체하지 않으며 데이터 변환·메시지·지도 갱신 코드를 연결합니다.

## 경복궁 권역·경로·마커로 시작하기

웹 `/integration#quickstart`에서 **경복궁 예제 새 창으로 편집**을 누르세요. 경복궁을 감싸는 사각형(Polygon), 예제 경로(LineString), 경로의 시작 위치 마커(Point)를 함께 새 창에 보내고, 편집 후 저장한 결과를 문서 안의 지도와 JSON에 반영합니다. 실제 지적·행정 경계나 공식 관람 동선이 아닌 연습용 데이터입니다.

1. [input-scene.example.ts](../src/pages/docs/content/examples/input-scene.example.ts)의 도형 3개를 같은 `features` 배열에 준비합니다. 좌표는 모두 `[경도, 위도]` 순서입니다. Polygon은 링을 닫고, LineString은 두 개 이상의 좌표를 연결하며, Point는 좌표 한 쌍만 사용합니다. [주석 포함 JSONC](../src/pages/docs/content/examples/input-scene.example.jsonc)에서 각 필드의 목적을 확인할 수 있습니다.
2. [gyeongbokgung.example.ts](../src/pages/docs/content/examples/gyeongbokgung.example.ts)의 `mountPalaceExample(button, resultElement, editorUrl)`을 자신의 화면에서 호출합니다.
3. 새 창의 목록에서 **경복궁 예제 권역**, **경복궁 예제 경로**, **경복궁 예제 마커**를 골라 편집합니다. ‘저장하고 편집 완료’를 누르면 세 도형을 담은 `onSubmit(editedScene)`을 받습니다.
4. `scene = editedScene`으로 기준 데이터를 바꾸고 자신의 지도 갱신·서버 저장을 연결합니다. 다음 편집은 수정된 좌표로 시작합니다.

`createMapEditorHost`는 문서에서 복사해 쓰는 보조 코드이며 별도 배포된 SDK가 아닙니다. 입력 파일, 시작 예제, 메시지 helper, 검증 파일을 같은 폴더에 두고 `npm install zod`로 의존성을 준비합니다. 일반 사용자는 Termia 내부 코드를 수정하지 않습니다.

도구 위치는 웹 `/editing#screen`의 **실제 편집 화면 안내**에서 버튼을 눌러 확인하세요. 캡처는 경복궁을 선택하고 수동으로 확대한 모습입니다. 현재 editor는 초기 위치 자동 맞춤을 하지 않습니다.

## 에디터 URL과 연결 조건

에디터 URL: `https://maps-editor.pages.dev/editor/`

- **HTTPS 사이트는 도메인이 달라도 연동할 수 있습니다.** 예를 들어 `https://naver.com`에서 우리 에디터를 새 창으로 열고 데이터를 주고받을 수 있습니다. 기본 설정에서는 별도 도메인 등록이 필요하지 않습니다.
- **HTTP·로컬 개발 주소에는 추가 조건이 있습니다.** `http://localhost:3000`에서 상용 에디터에 연결하려면 운영자가 그 주소를 별도로 허용해야 합니다. 에디터도 같은 프로토콜·호스트·포트에서 실행한다면 기본 설정으로 연동할 수 있습니다. 이 세 가지의 조합을 origin이라고 하며, URL 경로는 포함하지 않습니다.
- 운영자가 특정 사이트만 허용하도록 설정한 에디터는 HTTPS라도 해당 허용 목록에 있는 사이트에서만 연동할 수 있습니다. `file://`와 `null` origin은 지원하지 않습니다.
- 서비스 페이지는 결과 수신까지 열려 있어야 합니다. `window.opener`를 유지해야 하므로 `noopener`·`noreferrer` 및 창 연결을 끊는 보안 정책과는 맞지 않습니다.
- URL만 여는 것으로는 서비스 데이터가 전달되지 않습니다. 아래 메시지로 명시적으로 보내야 하며, 에디터가 서비스 화면이나 서버 데이터를 자동으로 읽지 않습니다.

## 최소 흐름

1. 서비스 페이지에서 message 수신기를 등록합니다.
2. 사용자 클릭에서 `window.open(editorUrl)`로 새 창을 엽니다. `noopener`·`noreferrer`로 opener를 끊지 않습니다.
3. 내가 연 팝업의 READY에 INIT으로 응답합니다. INIT에는 비어 있지 않은 sessionId와 v2 scene을 넣습니다.
4. SUBMIT/CANCEL의 source·origin·sessionId·메시지 구조를 검증합니다.
5. SUBMIT은 서비스 페이지 초안 교체 후 필요한 저장 API를 호출합니다. CANCEL이면 기존 데이터를 유지합니다. 팝업은 서비스 페이지가 닫습니다.

| type              | 방향                   | 데이터                                           |
| ----------------- | ---------------------- | ------------------------------------------------ |
| MAP_EDITOR_READY  | 에디터 → 서비스 페이지 | 준비 신호만                                      |
| MAP_EDITOR_INIT   | 서비스 페이지 → 에디터 | sessionId, scene                                 |
| MAP_EDITOR_SUBMIT | 에디터 → 서비스 페이지 | 동일 sessionId, 전체 scene                       |
| MAP_EDITOR_CANCEL | 에디터 → 서비스 페이지 | 동일 sessionId, scene 없음                       |
| MAP_EDITOR_ERROR  | 에디터 → 서비스 페이지 | message, 선택적 issues; sessionId가 없을 수 있음 |

**INIT은 상태 업데이트가 아닙니다.** 새 INIT은 편집과 이력을 초기화합니다. 중간 MAP_EDITOR_CHANGE는 보내지 않습니다. 서비스 페이지는 토큰을 보내거나 에디터의 Google 세션을 관리할 필요가 없습니다.

`sessionId`는 서비스가 편집 회차마다 만드는 고유한 문자열이며 로그인 자격 증명이 아닙니다. 같은 창의 READY 재전송에는 같은 회차의 입력 스냅샷과 sessionId로 응답합니다.

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
- 지도 인스턴스나 SDK 폴리곤 객체를 보내지 않습니다. 편집할 폴리곤을 위 형식으로 변환합니다. 다른 좌표계를 쓰는 지도라면 입력 시 WGS84로 변환하고 결과를 지도에 반영할 때 필요한 역변환을 처리합니다.
- Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon을 지원합니다.
- Polygon은 서로 다른 정점 3개 이상이 필요합니다. 열린 링은 입력 정규화가 닫지만 예제처럼 닫힌 링을 권장합니다.
- 도형의 id·name·locked·visible·themeToken·properties와 scene의 id·name·viewport는 선택입니다. id를 제공하면 중복되지 않아야 합니다.
- 배열 뒤쪽이 지도 위쪽입니다. SUBMIT도 이 순서를 유지하며 내부 layers·선택·히스토리·인증 토큰은 포함하지 않습니다.
- locked는 UI에서 해제 가능한 잠금이며 서버 권한이 아닙니다. 숨긴 도형도 결과에 포함됩니다.

Point/Path만 있는 입력도 완료할 수 있습니다. ‘반환할 폴리곤이 없습니다’는 안내 문구이며 저장 차단 조건이 아닙니다.

## 보내기 → 새 창 표시 → 저장 결과

ID가 `gyeongbokgung-area`, 이름이 `경복궁 예제 권역`, 속성이 `{ serviceAreaId: "palace-001" }`인 Polygon에 예제 경로와 마커를 함께 보냅니다. 북동쪽 정점을 `[126.982, 37.5855]`에서 `[126.984, 37.5865]`로 옮겼다면 같은 ID·업무 속성과 변경된 좌표를 돌려받습니다. 수정하지 않은 경로와 마커도 기존 좌표로 함께 반환됩니다. 실제 메시지 비교는 웹 `/integration#roundtrip`과 [입출력 예제](../src/pages/docs/content/roundtripExamples.ts)에 있습니다.

도형은 전달한 좌표 위치에 표시됩니다. 현재 에디터는 기본 중심 `[126.98, 37.57]`, 줌 12에서 시작하며 입력 범위로 자동 이동하지 않습니다. `viewport.center`·`zoom`은 입출력에 보존되지만 화면 위치에는 적용되지 않습니다. `features: []`를 INIT으로 보내면 새 권역을 그릴 수 있습니다.

| 편집 내용                        | 서비스가 받는 결과                                  |
| -------------------------------- | --------------------------------------------------- |
| 정점 이동·합치기·빼기            | 연산을 반영한 geometry                              |
| 도형 삭제                        | 전체 features에서 해당 도형 제외                    |
| 도형 숨김·잠금                   | 도형은 포함하며 visible·locked 반영                 |
| 직접 그리기·경계 추가            | 새 ID의 도형 포함. 업무 ID가 필요하면 서비스가 연결 |
| 행정동·법정동을 참고로 보기만 함 | 참고 경계는 반환하지 않음                           |
| 취소                             | CANCEL만 수신, scene 없음. 기존 데이터를 유지       |

SUBMIT은 변경분만 보내는 이벤트가 아닙니다. 입력과 반환을 ID로 대응시키되 **전체 features를 다음 편집 초안으로 사용**합니다. 기존 업무 속성은 유지되지만 새로 만든 도형에는 서비스의 업무 ID가 자동으로 생기지 않습니다. 결과에 내부 레이어·선택·히스토리·인증 토큰은 들어가지 않습니다.

에디터의 저장은 결과 반환입니다. 서비스 DB 영구 저장은 결과 수신 후 서비스가 처리하며, 중간 변경 전송이나 자동 저장은 하지 않습니다.

## 예제 사용

`npm install zod` 후 다음 네 파일을 같은 폴더에 두세요. 예제는 프로젝트 타입 검사와 테스트 대상이기도 합니다.

| 파일                                                                                        | 책임                                 |
| ------------------------------------------------------------------------------------------- | ------------------------------------ |
| [editor-contract.example.ts](../src/pages/docs/content/examples/editor-contract.example.ts) | 외부 완료 메시지의 구조·좌표 검증    |
| [input-scene.example.ts](../src/pages/docs/content/examples/input-scene.example.ts)         | Polygon + Point 입력                 |
| [map-editor-host.example.ts](../src/pages/docs/content/examples/map-editor-host.example.ts) | 팝업·source/origin/session 검증·종료 |
| [service-page.example.ts](../src/pages/docs/content/examples/service-page.example.ts)       | 서비스 지도·버튼·입출력·오류 연결    |

`bindMapEditor`에 다음 값을 전달하고 반환된 정리 함수를 서비스 페이지의 unmount 시 실행합니다. 지도 인스턴스를 새 창으로 보내는 것이 아니라, 지도에서 읽은 폴리곤 좌표를 전달합니다.

| 항목                             | 서비스에서 제공할 값                                                           |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `editorUrl`                      | 실제 배포된 에디터 URL                                                         |
| `openButton`                     | 사용자 클릭을 받을 HTMLButtonElement                                           |
| `getScene()`                     | 현재 EditorSceneInput v2를 반환하는 함수                                       |
| `applyScene(scene)`              | 검증된 결과 전체를 서비스 상태에 반영하는 함수                                 |
| `renderOnMap(featureCollection)` | 반환된 GeoJSON을 지도 라이브러리의 형식으로 변환해 기존 폴리곤을 갱신하는 함수 |
| `showEditorError(message)`       | 오류를 사용자에게 안전하게 표시하는 함수                                       |

`applyScene`에서 `getScene`이 읽는 데이터를 갱신하면 다음 창도 수정본으로 시작합니다. 입력 스냅샷은 창을 열 때 고정하며 중복 클릭은 기존 편집 창에 포커스합니다. 취소 시 결과 반영 함수를 호출하지 않습니다.

예제는 저장 API를 호출하지 않으며, 결과 검증 스키마도 업무별 면적·위치·저장 권한을 대신하지 않습니다. 서비스 서버가 반드시 최종 검증해야 합니다.

에디터의 ‘저장하고 편집 완료’는 결과 반환이며 서비스 서버의 저장 성공을 보장하지 않습니다. 영구 저장이 필요하면 결과를 받은 서비스가 API 호출·실패 표시·재시도를 구현하세요.

## 보안·문제 해결

- `event.origin`에서 목적지를 추론하지 않습니다. 배포할 editorUrl로 계산한 origin만 사용합니다.
- 데이터가 담긴 postMessage의 targetOrigin에 `"*"`를 쓰지 않습니다. 에디터의 데이터 없는 최초 READY만 예외입니다.
- source·origin은 모든 메시지에서, sessionId는 SUBMIT/CANCEL에서 검증합니다. sessionId는 로그인 자격 증명이 아닙니다.
- 새 창이 안 뜨면 팝업 차단, READY가 없으면 수신기 등록 순서와 opener 유지 여부를 확인합니다.
- ERROR 메시지는 unknown 입력처럼 취급해 안전하게 표시합니다. INIT 오류는 좌표·중복 ID·v2 구조를 먼저 확인합니다.
- 공개 에디터의 경계 선택에 필요한 로그인은 에디터가 안내합니다. 서비스에서 Google 토큰이나 경계 API 키를 보내지 않습니다. 경계 접근에 문제가 있으면 해당 에디터 운영자에게 문의하세요.

## 주소만 열어 사용하는 단독 실행

현재 `/editor/`를 직접 열면 INIT을 기다립니다. 지도 편집 자체가 부모 창에 종속된 것은 아니지만, 현재 시작·완료 흐름은 연결된 창을 요구합니다. 단독 실행을 지원하려면 ‘새 지도/JSON 가져오기’와 ‘JSON 내보내기/별도 저장’을 함께 정의해야 합니다.

이번에는 동작을 바꾸지 않았습니다. 자동 대기 해제보다 명시적인 모드 구분을 권장하며, 단독 작업 중 늦게 도착한 INIT이 편집 내용을 덮어쓰지 않게 해야 합니다. 구현 위치와 검토안은 [새 창 연동과 단독 실행 검토](editor-entry-modes.md)를 참고하세요. 이 문서의 제안은 아직 구현된 기능이 아닙니다.
