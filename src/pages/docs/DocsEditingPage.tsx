import { Link } from "react-router";
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

export function DocsEditingPage() {
  return (
    <DocsArticle>
      <DocsHero
        title="편집 동작"
        eyebrow="기능·QA 참고"
        description="부모 서비스가 기대할 수 있는 편집 범위와 결과 반환 조건입니다. 연결 방식은 부모 창 연동 문서를 참고하세요."
      />
      <DocsSection id="screen" title="화면 구성">
        <DocsList>
          <DocsListItem>
            지도: 부모가 보낸 도형과 현재 화면의 참고 경계를 표시합니다.
          </DocsListItem>
          <DocsListItem>
            왼쪽 도구: 선택·그리기·경계·반경 중 하나를 활성화합니다.
          </DocsListItem>
          <DocsListItem>
            레이어 패널: 도형 하나가 행 하나입니다. 맨 위 행이 지도에서도 위에
            그려집니다. 표시·잠금·이름·순서를 바꿀 수 있습니다.
          </DocsListItem>
          <DocsListItem>
            완료 바: 편집 결과를 부모에 반환하거나 결과 없이 취소합니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="tools" title="도구별 동작">
        <DocsTable
          label="도구별 동작과 제약"
          headers={["도구", "사용 방법", "결과·제약"]}
          rows={[
            {
              key: "select",
              cells: [
                "선택·이동",
                "클릭으로 선택, Cmd/Ctrl+클릭으로 다중 선택. 몸통은 Cmd/Ctrl+드래그로 이동합니다.",
                "잠금 해제되고 편집 가능한 도형만 이동합니다.",
              ],
            },
            {
              key: "vertex",
              cells: [
                "정점 편집",
                "선택 도구에서 편집 가능한 도형 한 개를 선택합니다. 정점 드래그·선 클릭·정점 우클릭으로 이동·추가·삭제합니다.",
                "별도의 더블클릭 진입은 필요 없습니다. 다중 선택이면 정점 핸들을 숨깁니다.",
              ],
            },
            {
              key: "draw",
              cells: [
                "그리기",
                "마커는 한 번 클릭, 패스는 2점 이상, 폴리곤은 서로 다른 3점 이상에서 완료합니다.",
                "패스·폴리곤은 Enter로 완료합니다. 진행 중 도구 전환은 취소 확인을 거칩니다.",
              ],
            },
            {
              key: "radius",
              cells: [
                "반경",
                "마커 한 개를 선택하고 반경을 입력합니다.",
                "0.01–1,000km의 새 원형 폴리곤을 생성합니다. 날짜변경선·극점을 넘는 결과는 거부합니다.",
              ],
            },
            {
              key: "boundary",
              cells: [
                <Link key="authentication" to="/authentication">
                  경계 데이터
                </Link>,
                "Google 로그인 후 행정동·법정동·우편번호를 조회합니다. +로 생성하거나 선택 도형과 연산합니다.",
                "표시는 단순화본, 편집 연산은 원본을 사용합니다. 서버 경계는 변경하지 않습니다.",
              ],
            },
            {
              key: "hole-fill",
              cells: [
                "빈 공간 채우기",
                "레이어 행의 연필 오른쪽 페인트통을 누르고 최대 면적(㎡)을 입력합니다. 청록색 미리보기를 확인한 뒤 적용합니다.",
                "선택·경계 도구에서, 표시된 편집 가능 폴리곤에 내부 구멍이 있을 때 활성화됩니다. 해당 행만 수정하며 열린 틈·큰 구멍은 유지합니다. 기본 기준은 1,000㎡이며 취소는 변경 없이, 적용은 undo 한 번으로 복원됩니다.",
              ],
            },
            {
              key: "boolean",
              cells: [
                "폴리곤 연산",
                "선택 도형과 다른 편집 가능한 도형을 병합·차집합·교집합으로 조합합니다.",
                "병합은 상대 도형을 소비하고, 차집합·교집합은 상대 도형을 남깁니다. 한 번의 undo로 되돌립니다.",
              ],
            },
          ]}
        />
        <Callout className="mt-4" title="잠금과 원본 보호" tone="note">
          잠금은 편집 UI에서 해제할 수 있는 상태이며 서버 권한이 아닙니다. 부모창이
          전달한 원본에는 삭제 버튼이 없습니다. 다만 병합·차집합 같은 연산으로 결과가
          달라질 수 있으므로 부모도 저장 전 검증해야 합니다.
        </Callout>
      </DocsSection>
      <DocsSection id="finish" title="저장·취소 조건">
        <DocsList>
          <DocsListItem>
            저장 시 <DocsCode>MAP_EDITOR_SUBMIT</DocsCode>으로 전체 scene을 반환합니다.
            Point나 Path만 있어도 저장할 수 있습니다. ‘반환할 폴리곤이 없습니다’는
            안내이며 저장을 차단하지 않습니다.
          </DocsListItem>
          <DocsListItem>
            오류가 있는 도형, 진행 중 그리기·반경 입력·경계 연산·이름 변경·빈 공간
            채우기는 먼저 완료하거나 취소해야 합니다.
          </DocsListItem>
          <DocsListItem>
            취소 시 <DocsCode>MAP_EDITOR_CANCEL</DocsCode>만 반환합니다. 미저장 변경이
            있으면 확인하며, 부모는 기존 데이터를 유지합니다.
          </DocsListItem>
          <DocsListItem>
            숨긴 도형도 반환 데이터에 포함됩니다. 서버 저장이나 중간 변경 자동 전송은
            하지 않습니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="shortcuts" title="필수 단축키">
        <DocsTable
          label="필수 단축키"
          headers={["동작", "키"]}
          rows={[
            {
              key: "undo",
              cells: [
                "되돌리기 / 다시 실행",
                "Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z (Windows: Ctrl+Y도 지원)",
              ],
            },
            {
              key: "copy",
              cells: ["선택 도형 복사 / 붙여넣기", "Cmd/Ctrl+C / Cmd/Ctrl+V"],
            },
            {
              key: "complete",
              cells: ["패스·폴리곤 완료 / 그리기 취소 확인", "Enter / Escape"],
            },
            {
              key: "keyboard",
              cells: [
                "키보드 그리기",
                "지도에 포커스 → K → 방향키로 이동 → Space로 점 추가",
              ],
            },
          ]}
        />
      </DocsSection>
    </DocsArticle>
  );
}
