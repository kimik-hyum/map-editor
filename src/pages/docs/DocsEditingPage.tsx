import { useT } from "@/shared/i18n/useT";
import {
  Callout,
  DocsArticle,
  DocsCode,
  DocsHero,
  DocsList,
  DocsListItem,
  DocsSection,
} from "./components";
import { DocsTable } from "./components/DocsTable";
import { DocsEditorTour } from "./components/DocsEditorTour";

export function DocsEditingPage() {
  const t = useT();
  return (
    <DocsArticle>
      <DocsHero
        title={t("편집 도구 안내")}
        eyebrow={t("도구 사용법")}
        description={t(
          "편집 창에서 도형을 만들고 수정하는 방법입니다. 경복궁 사각형이 표시된 화면에서 도구 위치를 확인하고, 실습에서 같은 동작을 따라 해보세요.",
        )}
      />
      <DocsSection id="screen" title={t("화면 구성")}>
        <DocsEditorTour />
      </DocsSection>
      <DocsSection id="tools" title={t("도구별 동작")}>
        <DocsTable
          className="[&_table]:min-w-[760px] [&_th:first-child]:w-40 [&_td:first-child]:min-w-40 [&_td:first-child]:whitespace-nowrap"
          label={t("도구별 동작과 제약")}
          headers={[t("도구"), t("사용 방법"), t("결과·제약")]}
          rows={[
            {
              key: "navigate",
              cells: [
                t("지도 이동·확대"),
                t(
                  "지도를 드래그해 이동하고 휠이나 확대·축소 버튼으로 배율을 바꿉니다. 경계 이름·버튼 위에서도 드래그할 수 있습니다.",
                ),
                t(
                  "지도 이동과 줌은 도형 좌표를 바꾸지 않습니다. 도형 이동은 선택 도구에서 Cmd/Ctrl+드래그를 사용합니다.",
                ),
              ],
            },
            {
              key: "select",
              cells: [
                t("선택·이동"),
                t(
                  "클릭으로 선택, Cmd/Ctrl+클릭으로 다중 선택. 몸통은 Cmd/Ctrl+드래그로 이동합니다.",
                ),
                t("잠금 해제되고 편집 가능한 도형만 이동합니다."),
              ],
            },
            {
              key: "vertex",
              cells: [
                t("정점 편집"),
                t(
                  "선택 도구에서 편집 가능한 도형 한 개를 선택합니다. 정점 드래그·선 클릭·정점 우클릭으로 이동·추가·삭제합니다.",
                ),
                t(
                  "별도의 더블클릭 진입은 필요 없습니다. 다중 선택이면 정점 핸들을 숨깁니다.",
                ),
              ],
            },
            {
              key: "draw",
              cells: [
                t("그리기"),
                t(
                  "마커는 한 번 클릭, 패스는 2점 이상, 폴리곤은 서로 다른 3점 이상에서 완료합니다.",
                ),
                t(
                  "패스·폴리곤은 Enter로 완료합니다. 진행 중 도구 전환은 취소 확인을 거칩니다.",
                ),
              ],
            },
            {
              key: "radius",
              cells: [
                t("반경"),
                t(
                  "지도나 레이어 목록에서 마커 한 개를 선택하면 활성화됩니다. 반경 버튼을 누르고 거리를 입력합니다.",
                ),
                t(
                  "0.01–1,000km의 새 원형 폴리곤을 생성합니다. 날짜변경선·극점을 넘는 결과는 거부합니다.",
                ),
              ],
            },
            {
              key: "boundary",
              cells: [
                t("경계 데이터"),
                t(
                  "편집 창의 로그인 안내를 따른 뒤 행정동·법정동·우편번호를 조회합니다. 경계 이름 옆의 작은 아이콘으로 추가·합치기·빼기를 실행합니다. 호버 없이 표시되며 버튼에 마우스를 올리면 동작을 설명합니다.",
                ),
                t(
                  "축소하면 시군구 경계를 대신 표시할 수 있습니다. 원하는 경계가 보이지 않으면 확대하세요. 표시용 경계는 경량화되지만 추가·연산은 원본을 사용하며 서버의 경계 데이터는 변경하지 않습니다.",
                ),
              ],
            },
            {
              key: "hole-fill",
              cells: [
                t("빈 공간 채우기"),
                t(
                  "레이어 행의 연필 오른쪽 페인트통을 누르고 최대 면적(㎡)을 입력합니다. 청록색 미리보기를 확인한 뒤 적용합니다.",
                ),
                t(
                  "선택·경계 도구에서, 표시된 편집 가능 폴리곤에 내부 구멍이 있을 때 활성화됩니다. 해당 행만 수정하며 열린 틈·큰 구멍은 유지합니다. 기본 기준은 1,000㎡이며 취소는 변경 없이, 적용은 undo 한 번으로 복원됩니다.",
                ),
              ],
            },
            {
              key: "boolean",
              cells: [
                t("폴리곤 연산"),
                t(
                  "선택 도형과 다른 편집 가능한 도형을 병합·차집합·교집합으로 조합합니다.",
                ),
                t(
                  "병합은 상대 도형을 소비하고, 차집합·교집합은 상대 도형을 남깁니다. 한 번의 undo로 되돌립니다.",
                ),
              ],
            },
          ]}
        />
        <Callout className="mt-4" title={t("잠금과 원본 보호")} tone="note">
          {t(
            "잠금은 편집 화면에서 해제할 수 있는 상태이며 서버 권한이 아닙니다. 서비스 페이지가 전달한 원본에는 삭제 버튼이 없습니다. 다만 병합·차집합 같은 연산으로 결과가 달라질 수 있으므로 서비스에서도 서버에 저장하기 전에 검증해야 합니다.",
          )}
        </Callout>
      </DocsSection>
      <DocsSection id="operations" title={t("합치기·빼기·교집합 아이콘")}>
        <DocsTable
          label={t("도형 연산 아이콘")}
          headers={[t("버튼"), t("참고 경계에서"), t("편집 도형끼리")]}
          rows={[
            {
              key: "union",
              cells: [
                t("+ · 검정"),
                t(
                  "대상 도형이 없으면 경계를 새 도형으로 추가합니다. 대상이 있으면 선택 도형에 경계를 합칩니다.",
                ),
                t("선택 도형과 상대 도형을 합치고 상대 도형을 제거합니다."),
              ],
            },
            {
              key: "difference",
              cells: [
                t("− · 빨강"),
                t("선택 도형에서 경계와 겹친 면적을 뺍니다."),
                t(
                  "선택 도형에서 상대 도형과 겹친 면적을 뺍니다. 상대 도형은 남깁니다.",
                ),
              ],
            },
            {
              key: "intersection",
              cells: [
                t("교집합 · 보라"),
                t(
                  "참고 경계에는 교집합 버튼이 없습니다. 선택을 해제하고 +로 경계를 새 도형으로 추가한 뒤, 선택 도구에서 편집 도형끼리 연산합니다.",
                ),
                t(
                  "선택 도형과 상대 도형이 겹친 면적만 남깁니다. 상대 도형은 남깁니다.",
                ),
              ],
            },
          ]}
        />
        <Callout className="mt-4" title={t("버튼이 비활성 상태라면")} tone="note">
          {t(
            "선택한 도형이 편집 가능한 폴리곤인지 확인하세요. 빼기·교집합은 실제 겹친 면적이 있을 때만 활성화됩니다. 버튼의 마우스 오버 설명에서 대상과 동작을 확인할 수 있고, 적용한 연산은 되돌리기로 복원할 수 있습니다.",
          )}
        </Callout>
      </DocsSection>
      <DocsSection id="finish" title={t("편집 완료·취소 조건")}>
        <DocsList>
          <DocsListItem>
            {t("‘저장하고 편집 완료’를 누르면")} <DocsCode>MAP_EDITOR_SUBMIT</DocsCode>
            {t("으로 전체 편집 데이터(")}
            <DocsCode>scene</DocsCode>
            {t(
              ")를 서비스 페이지에 보냅니다. 점이나 선만 있어도 편집을 완료할 수 있습니다. ‘반환할 폴리곤이 없습니다’는 안내이며 결과 전송을 차단하지 않습니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "오류가 있는 도형, 진행 중 그리기·반경 입력·경계 연산·이름 변경·빈 공간 채우기는 먼저 완료하거나 취소해야 합니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t("취소 시")} <DocsCode>MAP_EDITOR_CANCEL</DocsCode>
            {t(
              "만 보냅니다. 완료하지 않은 변경이 있으면 확인하며, 서비스 페이지는 기존 데이터를 유지합니다.",
            )}
          </DocsListItem>
          <DocsListItem>
            {t(
              "숨긴 도형도 편집 결과에 포함됩니다. 결과를 화면에 반영하거나 서버에 저장하는 동작은 서비스 페이지에서 연결합니다. 편집 중 변경 사항은 자동 전송하지 않습니다.",
            )}
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="shortcuts" title={t("필수 단축키")}>
        <DocsTable
          label={t("필수 단축키")}
          headers={[t("동작"), t("키")]}
          rows={[
            {
              key: "undo",
              cells: [
                t("되돌리기 / 다시 실행"),
                t("Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z (Windows: Ctrl+Y도 지원)"),
              ],
            },
            {
              key: "copy",
              cells: [t("선택 도형 복사 / 붙여넣기"), "Cmd/Ctrl+C / Cmd/Ctrl+V"],
            },
            {
              key: "complete",
              cells: [t("패스·폴리곤 완료 / 그리기 취소 확인"), "Enter / Escape"],
            },
            {
              key: "keyboard",
              cells: [
                t("키보드 그리기"),
                t("지도에 포커스 → K → 방향키로 이동 → Space로 점 추가"),
              ],
            },
          ]}
        />
      </DocsSection>
    </DocsArticle>
  );
}
