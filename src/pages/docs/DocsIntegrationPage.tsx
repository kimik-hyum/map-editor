import { useContext } from "react";
import { LocaleContext } from "@/shared/i18n/localeContext";
import { useT } from "@/shared/i18n/useT";
import { LocalizedLink as Link } from "@/shared/i18n/LocalizedLink";
import {
  Callout,
  DocsArticle,
  DocsCode,
  DocsCodeBlock,
  DocsHero,
  DocsList,
  DocsListItem,
  DocsSection,
  DocsText,
} from "./components";
import { DocsTable } from "./components/DocsTable";
import { DocsGyeongbokgungExample } from "./components/DocsGyeongbokgungExample";
import {
  inputSceneSource,
  messageSchemaExample,
  minimalServiceExample,
  parentHostExample,
  resultUsageExample,
} from "./content/parentIntegrationExamples";
import { initMessageExample, submitMessageExample } from "./content/roundtripExamples";

const exampleMarkup = `<button id="edit" type="button">도형 편집하기</button>
<pre id="result"></pre>`;
const exampleMount = `import { mountMinimalExample } from "./minimal-service.example";

const button = document.querySelector<HTMLButtonElement>("#edit");
const result = document.querySelector<HTMLElement>("#result");
if (button && result) {
  const cleanup = mountMinimalExample(button, result);
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) cleanup();
  });
}`;

export function DocsIntegrationPage() {
  const t = useT();
  const locale = useContext(LocaleContext) ?? "ko";
  return (
    <DocsArticle>
      <DocsHero
        title={t("편집 창 연동하기")}
        eyebrow={t("연동 인터페이스 · 서비스 개발자를 위한 안내")}
        description={t(
          "서비스 페이지에서 편집 창을 열고, 편집할 데이터를 보내고, 편집 결과를 받는 방법입니다. 편집기 주소와 메시지 순서를 확인한 뒤 사각형 하나로 연결해 보세요.",
        )}
      />
      <DocsSection id="addresses" title={t("편집기 주소와 연결 조건")}>
        <DocsText className="mb-3">
          <strong>{t("서비스 페이지")}</strong>
          {t("는 편집 창을 열고 결과를 받을 웹페이지입니다.")}
          <strong> {t("편집 창")}</strong>
          {t("은 아래 주소를 새 창으로 연 화면입니다. 데이터는 브라우저의")}{" "}
          <DocsCode>postMessage</DocsCode>
          {t("로 두 창 사이에서 주고받습니다.")}
        </DocsText>
        <div className="overflow-x-auto rounded-lg border border-line bg-white p-4">
          <DocsCode>{`https://maps-editor.pages.dev/${locale}/editor/`}</DocsCode>
        </div>
        <DocsList className="mt-4">
          <DocsListItem>
            <strong>{t("다른 HTTPS 도메인에서도 연결할 수 있습니다.")}</strong>{" "}
            {t(
              "서비스 페이지에 자바스크립트를 추가할 수 있어야 하며, 공개 편집기의 기본 설정에서는 별도 도메인 등록이 필요하지 않습니다. 지도 라이브러리 없이도 연결할 수 있습니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "사용자 클릭으로 편집 창을 열고 서비스 페이지는 결과를 받을 때까지 유지하세요. 주소에 데이터를 붙이는 대신, 준비 완료 알림을 받은 뒤 메시지로 보냅니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            <DocsCode>http://localhost:3000</DocsCode>{" "}
            {t(
              "같은 HTTP 개발 주소에서 공개 편집기를 사용하려면 편집기 운영자의 허용이 필요합니다. 서비스 페이지와 편집기를 같은 프로토콜·도메인·포트에서 실행하는 로컬 환경은 기본 설정으로 연결할 수 있습니다.",
            )}
          </DocsListItem>
        </DocsList>
        <details className="mt-4 rounded-lg border border-line p-4">
          <summary className="cursor-pointer font-bold text-ink">
            {t("창 연결과 주소 확인의 상세 조건")}
          </summary>
          <DocsText className="mt-3">
            {t("사이트 주소(")}
            <DocsCode>origin</DocsCode>
            {t(
              ")는 프로토콜·도메인·포트의 조합이며 경로는 포함하지 않습니다. 예를 들어",
            )}{" "}
            <DocsCode>https://service.example/orders</DocsCode>
            {t("의 사이트 주소는")} <DocsCode>https://service.example</DocsCode>
            {t(
              "입니다. 편집기 운영자가 허용 목록을 설정한 배포에서는 HTTPS도 그 목록을 따릅니다.",
            )}
          </DocsText>
          <DocsText className="mt-3">
            {t("두 창의 연결을 유지하기 위해")} <DocsCode>noopener</DocsCode>·
            <DocsCode>noreferrer</DocsCode>
            {t(
              "를 사용하지 마세요. 창 연결을 끊는 보안 정책도 확인해야 합니다. iframe·file://·null origin은 지원하지 않습니다.",
            )}
          </DocsText>
        </details>
        <Callout
          className="mt-4"
          tone="note"
          title={t("주소만 직접 열면 편집 데이터를 기다립니다")}
        >
          <span id="standalone" className="scroll-mt-24" />
          {t(
            "서비스 페이지에서 편집 창을 열고 데이터를 보내야 편집을 시작할 수 있습니다. 먼저 동작을 확인하려면",
          )}{" "}
          <a href="#quickstart">{t("문서 안의 실습")}</a>
          {t("을 사용하세요.")}
        </Callout>
      </DocsSection>
      <DocsSection id="messages" title={t("두 창이 데이터를 주고받는 순서")}>
        <DocsTable
          label={t("편집 창 메시지 순서")}
          headers={[t("단계"), t("방향"), t("메시지와 데이터")]}
          rows={[
            {
              key: "ready",
              cells: [
                t("1. 준비 완료 알림"),
                t("편집 창 → 서비스 페이지"),
                t("MAP_EDITOR_READY · 데이터를 받을 준비가 되었음을 알림"),
              ],
            },
            {
              key: "init",
              cells: [
                t("2. 편집할 데이터 보내기"),
                t("서비스 페이지 → 편집 창"),
                t("MAP_EDITOR_INIT · 편집 작업 ID(sessionId)와 편집 데이터(scene)"),
              ],
            },
            {
              key: "submit",
              cells: [
                t("3. 편집 결과 보내기"),
                t("편집 창 → 서비스 페이지"),
                t("MAP_EDITOR_SUBMIT · 같은 sessionId와 최종 scene 전체"),
              ],
            },
            {
              key: "cancel",
              cells: [
                t("취소한 경우"),
                t("편집 창 → 서비스 페이지"),
                t("MAP_EDITOR_CANCEL · 같은 sessionId, 편집 결과 없음"),
              ],
            },
            {
              key: "error",
              cells: [
                t("입력 오류가 있는 경우"),
                t("편집 창 → 서비스 페이지"),
                t("MAP_EDITOR_ERROR · 오류 설명(message), 선택적 상세 정보(issues)"),
              ],
            },
          ]}
        />
        <DocsText className="mt-3">
          <strong>{t("편집 작업 ID")}</strong>(<DocsCode>sessionId</DocsCode>
          {t(
            ")는 서비스 페이지가 이번 편집을 구분하기 위해 만드는 고유한 문자열입니다. 로그인 토큰이 아닙니다. 결과의 작업 ID를 확인한 뒤 편집 창을 닫고 결과를 반영합니다. 취소한 경우에는 기존 데이터를 유지합니다.",
          )}
        </DocsText>
      </DocsSection>
      <DocsSection id="example" title={t("사각형 하나를 보내고 결과 JSON 받기")}>
        <DocsText className="mb-4">
          {t(
            "아래 예제는 지도 라이브러리 없이 버튼과 결과 표시 영역만 사용합니다. 편집 완료 시",
          )}{" "}
          <DocsCode>onSubmit</DocsCode>
          {t("에 결과가 들어오고, 다음 편집에는 방금 받은 도형을 다시 보냅니다.")}
        </DocsText>
        <DocsList className="mb-4">
          <DocsListItem>
            {t("TypeScript를 빌드하는 서비스 프로젝트에서")}{" "}
            <DocsCode>npm install zod</DocsCode>
            {t(
              "를 실행합니다. 아래 최소 예제와 접힌 두 보조 파일을 같은 폴더에 저장하세요.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "서비스 페이지에 아래 HTML을 추가하고, 요소가 만들어진 뒤 연결 코드를 실행합니다. 편집기 자체의 설치나 별도 서버 구성은 필요하지 않습니다.",
            )}
          </DocsListItem>
        </DocsList>
        <DocsCodeBlock
          translateExample
          code={exampleMarkup}
          language="html"
          title={t("서비스 페이지의 HTML")}
        />
        <DocsCodeBlock
          translateExample
          className="mt-4"
          code={minimalServiceExample}
          language="typescript"
          title="minimal-service.example.ts"
        />
        <DocsCodeBlock
          translateExample
          className="mt-4"
          code={exampleMount}
          language="typescript"
          title={t("서비스 페이지에서 실행할 연결 코드")}
        />
        <DocsText className="mt-3">
          {t("React 등에서는 화면이 사라질 때 반환된 정리 함수")}{" "}
          <DocsCode>cleanup()</DocsCode>
          {t("을 실행하세요. 취소하면 결과 반영 함수를 호출하지 않습니다.")}
          <DocsCode>createMapEditorHost</DocsCode>
          {t(
            "는 이 문서에서 복사해 쓰는 보조 함수이며, 별도 배포된 SDK는 아닙니다. 창과 사이트 주소, 편집 작업 ID 및 결과 형식을 검사합니다.",
          )}
        </DocsText>
        <details className="mt-4 rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            {t("필수 보조 파일 · 창 연결과 메시지 처리")}
          </summary>
          <DocsCodeBlock
            translateExample
            className="mt-3"
            code={parentHostExample}
            language="typescript"
            title="map-editor-host.example.ts"
          />
        </details>
        <details className="mt-3 rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            {t("필수 보조 파일 · 편집 결과 검증과 타입")}
          </summary>
          <DocsCodeBlock
            translateExample
            className="mt-3"
            code={messageSchemaExample}
            language="typescript"
            title="editor-contract.example.ts"
          />
        </details>
      </DocsSection>
      <DocsSection id="scene" title={t("보내는 편집 데이터의 형식")}>
        <DocsText className="mb-4">
          {t("편집 데이터(")}
          <DocsCode>scene</DocsCode>
          {t(")는")} <DocsCode>version: 2</DocsCode>
          {t("와 도형 목록(")}
          <DocsCode>features</DocsCode>
          {t(")을 담습니다. 각 도형에 형태와 좌표 (")}
          <DocsCode>geometry</DocsCode>
          {t(")를 넣으세요. 빈 목록")}
          <DocsCode>{"{ version: 2, features: [] }"}</DocsCode>
          {t("으로 새 도형을 그리기부터 시작할 수도 있습니다.")}
        </DocsText>
        <DocsTable
          label={t("편집 데이터 필드")}
          headers={[t("필드"), t("뜻"), t("조건")]}
          rows={[
            {
              key: "version",
              cells: ["version", t("편집 데이터 형식의 버전"), t("필수 · 2")],
            },
            {
              key: "features",
              cells: ["features", t("도형 목록"), t("필수 · 빈 배열 허용")],
            },
            {
              key: "geometry",
              cells: [
                "features[].geometry",
                t("도형의 형태와 좌표"),
                t("필수 · GeoJSON geometry"),
              ],
            },
            {
              key: "identity",
              cells: [
                "features[].id · name",
                t("도형 식별자와 표시 이름"),
                t("선택 · id 생략 시 생성, 제공한 id는 중복 불가"),
              ],
            },
            {
              key: "properties",
              cells: [
                "features[].properties",
                t("서비스에서 함께 보낸 추가 정보"),
                t("선택 · 예: { deliveryAreaId: 'area-1' }"),
              ],
            },
            {
              key: "state",
              cells: [
                "features[].locked · visible · themeToken",
                t("잠금·표시·스타일"),
                t("선택 · 잠금은 사용자가 해제 가능"),
              ],
            },
            {
              key: "scene",
              cells: [
                "scene.id · name · viewport",
                t("편집 데이터 전체의 식별자·이름·지도 설정"),
                t("선택 · 현재 viewport는 결과에 보존되지만 지도 위치에 적용되지 않음"),
              ],
            },
          ]}
        />
        <DocsText className="mt-3">
          {t("좌표는 WGS84")} <DocsCode>{t("[경도, 위도]")}</DocsCode>{" "}
          {t(
            "순서입니다. 지도 객체 대신 좌표 데이터를 보내며, GeoJSON FeatureCollection 전체를 바로 보내는 형식은 아닙니다. 다각형(Polygon)은 첫 점과 마지막 점을 같게 해서 닫으세요.",
          )}
        </DocsText>
        <details className="mt-4 rounded-lg border border-line p-4">
          <summary className="cursor-pointer font-bold text-ink">
            {t("여러 도형을 보내는 예제와 추가 조건")}
          </summary>
          <DocsCodeBlock
            translateExample
            className="mt-3"
            code={inputSceneSource}
            language="typescript"
            title={t("input-scene.example.ts · 다각형·선·점")}
          />
          <DocsText className="mt-3">
            {t(
              "Point/MultiPoint/LineString/MultiLineString/Polygon/MultiPolygon을 지원합니다. GeometryCollection은 지원하지 않습니다. 좌표 범위는 경도 −180~180, 위도 −90~90이며, 다른 좌표계를 사용하면 변환이 필요합니다. 다각형은 서로 다른 정점이 최소 3개 있어야 합니다. 도형 목록의 뒤쪽 도형이 지도 위쪽에 표시되며, 결과도 이 순서를 유지합니다.",
            )}
          </DocsText>
        </details>
      </DocsSection>
      <DocsSection id="roundtrip" title={t("받은 편집 결과를 서비스에 반영하기")}>
        <DocsText className="mb-4">
          <DocsCode>MAP_EDITOR_SUBMIT</DocsCode>
          {t("의")} <DocsCode>scene</DocsCode>
          {t(
            "에는 최종 도형 목록 전체가 들어갑니다. 받은 편집 결과로 서비스 페이지가 보관한 데이터를 교체하세요. 변경된 도형만 추가하는 방식으로 처리하면 삭제된 도형이 남거나 중복될 수 있습니다.",
          )}
        </DocsText>
        <DocsTable
          label={t("편집 결과 처리")}
          headers={[t("편집 창에서 한 일"), t("서비스 페이지가 받는 결과")]}
          rows={[
            {
              key: "edit",
              cells: [
                t("도형 수정"),
                t("수정된 형태와 좌표. 기존 도형의 식별자와 추가 정보는 함께 반환"),
              ],
            },
            {
              key: "delete",
              cells: [
                t("도형 삭제·숨김"),
                t("삭제된 도형은 목록에서 제외. 숨긴 도형은 visible: false로 포함"),
              ],
            },
            {
              key: "new",
              cells: [
                t("도형 그리기·참고 경계 추가"),
                t("새 식별자의 도형 포함. 서비스의 업무 ID는 필요하면 서비스에서 연결"),
              ],
            },
            {
              key: "reference",
              cells: [
                t("참고 경계 조회"),
                t("조회만 한 참고 경계는 제외. 내 도형에 추가하거나 합친 결과만 포함"),
              ],
            },
            {
              key: "cancel",
              cells: [
                t("편집 취소"),
                t("취소 알림만 수신. 편집 데이터가 없으므로 기존 데이터를 유지"),
              ],
            },
          ]}
        />
        <Callout
          className="mt-4"
          tone="note"
          title={t("편집 완료와 서버 저장을 구분하세요")}
        >
          {t("편집 창의 ‘저장하고 편집 완료’ 버튼은 결과를 보내는 동작입니다.")}
          <DocsCode>onSubmit</DocsCode>
          {t(
            "에서 화면을 갱신하고, 필요하면 자신의 저장 API를 호출하세요. 저장 실패 표시와 재시도는 서비스에서 처리합니다.",
          )}
          <Link to="/editing#finish">{t("편집 완료 조건")}</Link>
        </Callout>
        <details className="mt-4 rounded-lg border border-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-ink">
            {t("지도 화면에 결과 반영하기 · bindMapEditor")}
          </summary>
          <DocsTable
            className="mt-3"
            label={t("서비스 페이지 연결 함수")}
            headers={[t("함수"), t("서비스에서 연결할 일")]}
            rows={[
              { key: "read", cells: ["getScene()", t("편집할 도형 목록과 설정 읽기")] },
              {
                key: "write",
                cells: [
                  "applyScene(scene)",
                  t("보관 중인 편집 데이터를 받은 결과 전체로 교체하기"),
                ],
              },
              {
                key: "map",
                cells: [
                  "renderOnMap(featureCollection)",
                  t("받은 좌표를 사용하는 지도 라이브러리로 변환해 표시하기"),
                ],
              },
              {
                key: "error",
                cells: ["showEditorError(message)", t("오류 설명을 화면에 표시하기")],
              },
            ]}
          />
          <DocsCodeBlock
            translateExample
            className="mt-3"
            code={resultUsageExample}
            language="typescript"
            title="service-page.example.ts"
          />
        </details>
      </DocsSection>
      <DocsSection id="quickstart" title={t("설치 없이 편집 결과를 받아보는 실습")}>
        <DocsText className="mb-4">
          {t(
            "이 문서가 서비스 페이지 역할을 합니다. 편집 창에 경복궁 주변의 다각형·선·점을 보내고, 편집을 완료하면 받은 결과를 아래 지도와 JSON에 반영합니다. 도구 사용법은",
          )}{" "}
          <Link to="/editing#screen">{t("편집 화면 안내")}</Link>
          {t("에서 확인하세요.")}
        </DocsText>
        <DocsGyeongbokgungExample />
        <details className="mt-4 rounded-lg border border-line p-4">
          <summary className="cursor-pointer font-bold text-ink">
            {t("실습의 전송 메시지와 편집 결과 예시")}
          </summary>
          <DocsText className="mt-3">
            {t(
              "아래 비교는 다각형의 북동쪽 정점 하나를 옮긴 예시입니다. 직접 편집한 결과는 위 실습의 JSON에 표시됩니다.",
            )}
          </DocsText>
          <DocsCodeBlock
            translateExample
            className="mt-3"
            code={initMessageExample}
            language="json"
            title={t("편집할 데이터를 보내는 메시지.json")}
          />
          <DocsCodeBlock
            translateExample
            className="mt-3"
            code={submitMessageExample}
            language="json"
            title={t("편집 결과를 받는 메시지.json")}
          />
        </details>
      </DocsSection>
      <DocsSection
        id="validation"
        title={t("메시지 처리를 직접 구현할 때 확인할 조건")}
      >
        <DocsList>
          <DocsListItem>
            {t(
              "메시지 수신기를 먼저 등록한 뒤 사용자 클릭에서 창을 엽니다. 메시지를 보낸 창(",
            )}
            <DocsCode>event.source</DocsCode>
            {t(")이 내가 연 편집 창인지, 사이트 주소(")}
            <DocsCode>event.origin</DocsCode>
            {t(
              ")가 정해 둔 편집기 주소와 맞는지 확인하세요. 완료·취소 알림은 편집 작업 ID와 데이터 구조도 검사합니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t("데이터를 보낼 때는 받을 사이트 주소(")}
            <DocsCode>targetOrigin</DocsCode>
            {t(")를 정확히 지정합니다.")} <DocsCode>*</DocsCode>
            {t(
              "는 쓰지 않습니다. 편집 데이터에는 로그인 토큰이나 비밀 키를 넣지 마세요.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "같은 편집 창이 준비 완료 알림을 다시 보내면 같은 편집 작업 ID와 처음 준비한 데이터로 응답합니다. 새 시작 메시지는 현재 편집과 되돌리기 기록을 초기화하므로 중간 데이터 갱신 용도로 반복해서 보내지 마세요.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "중간 변경 알림과 자동 저장은 제공하지 않습니다. 오류 설명은 안전한 텍스트로 표시하고, 서비스 서버에 저장할 때는 업무에 필요한 좌표·권한 검증을 수행하세요. 공개 편집기의 참고 경계 로그인은 편집 창에서 처리합니다.",
            )}
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="errors" title={t("연결이 안 될 때 확인하기")}>
        <DocsTable
          label={t("편집 창 연결 문제 해결")}
          headers={[t("증상"), t("확인할 것")]}
          rows={[
            {
              key: "popup",
              cells: [
                t("편집 창이 열리지 않음"),
                t("사용자 클릭에서 창을 여는지, 브라우저가 팝업을 차단했는지 확인"),
              ],
            },
            {
              key: "ready",
              cells: [
                t("편집 데이터를 기다리는 중"),
                t(
                  "서비스 페이지의 버튼으로 열었는지, 수신기를 먼저 등록했는지, 두 창의 연결과 사이트 주소가 유지되는지 확인",
                ),
              ],
            },
            {
              key: "geometry",
              cells: [
                t("보낸 도형이 화면에 안 보임"),
                t(
                  "목록에서 도형 이름 확인 후 지도 이동·확대. 현재 기본 중심 [126.98, 37.57], 줌 12이며 입력 범위로 자동 이동하지 않음",
                ),
              ],
            },
            {
              key: "init",
              cells: [
                t("입력 오류"),
                t(
                  "version: 2, 편집 작업 ID, 도형 ID 중복, 경도·위도 순서와 데이터 형식 확인",
                ),
              ],
            },
            {
              key: "persist",
              cells: [
                t("결과를 받았지만 서버에 저장되지 않음"),
                t(
                  "onSubmit에서 서비스의 저장 API를 호출하는지 확인. 실패 표시와 재시도도 서비스에서 처리",
                ),
              ],
            },
          ]}
        />
      </DocsSection>
    </DocsArticle>
  );
}
