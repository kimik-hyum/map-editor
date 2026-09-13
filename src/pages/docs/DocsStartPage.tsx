import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsCode,
  DocsHero,
  DocsList,
  DocsListItem,
  DocsSection,
  DocsText,
} from "./components";
import { DocsTable } from "./components/DocsTable";
import { DocsGyeongbokgungExample } from "./components/DocsGyeongbokgungExample";

export function DocsStartPage() {
  return (
    <DocsArticle>
      <DocsHero
        eyebrow="사용·연동 안내"
        id="overview"
        title="내 지도에 연결하는 폴리곤 편집기"
        description="서비스에서 사용 중인 지도와 에디터의 입출력 인터페이스를 맞추면, 폴리곤을 새 창에서 편집하고 결과를 원래 지도에 반영할 수 있습니다. 서로 다른 도메인에서도 같은 방식으로 연결합니다."
        actions={
          <DocsButton icon={ArrowRight} to="/demo">
            연동 데모 실행
          </DocsButton>
        }
      />
      <DocsSection id="quickstart" title="경복궁 권역·경로·마커로 먼저 실행해 보세요">
        <DocsText className="mb-4">
          버튼을 누르면 경복궁을 감싸는 사각형, 예제 경로와 시작 위치 마커가 새 창에
          표시됩니다. 도형을 선택해 꼭짓점을 옮기고 저장하면 이 지도와 JSON이 바뀝니다.
        </DocsText>
        <DocsGyeongbokgungExample />
        <DocsText className="mt-3">
          <Link to="/integration#scene">예제 코드로 연결하기 →</Link>
        </DocsText>
      </DocsSection>
      <DocsSection id="contract" title="서비스 페이지와 에디터 창">
        <DocsText className="mb-4">
          이 문서에서 <strong>서비스 페이지</strong>는 편집 버튼이 있는 기존 업무
          화면을, <strong>에디터 창</strong>은 그 버튼으로 새로 여는 Termia 화면을
          뜻합니다. 서비스 지도의 폴리곤을 에디터 입력 형식으로 보내고, 반환된 폴리곤을
          사용하는 지도 라이브러리의 갱신 API에 연결합니다.
        </DocsText>
        <DocsText className="mb-4">
          배포된 에디터를 사용하는 안내입니다. Termia 저장소를 복제하거나 내부 코드를
          수정할 필요 없이, 자신의 지도에서 입력과 결과를 연결하면 됩니다.
        </DocsText>
        <DocsList>
          <DocsListItem>
            서비스 페이지: 지도에서 편집할 폴리곤을 준비하고 창을 엽니다. 편집 결과로
            지도와 기준 데이터를 갱신하고, 필요하면 자신의 저장 API를 호출합니다.
          </DocsListItem>
          <DocsListItem>
            에디터 창: 전달받은 도형을 지도에 표시하고 편집 도구를 제공합니다. ‘저장하고
            편집 완료’를 누르면 결과 전체를 서비스 페이지에 반환합니다.
          </DocsListItem>
          <DocsListItem>
            직접 그리기와 전달받은 도형 편집은 로그인 없이 사용할 수 있습니다. 공개
            에디터의 행정동·법정동·우편번호 선택은 에디터가 로그인을 안내하며,
            서비스에서 로그인 기능을 구현하거나 토큰을 전달할 필요는 없습니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection id="connect" title="지도 데이터 전달부터 결과 반영까지">
        <DocsList>
          <DocsListItem>
            1. 서비스의 편집 버튼에서{" "}
            <DocsCode>https://maps-editor.pages.dev/editor/</DocsCode>를 새 창으로
            엽니다. 기존 지도를 교체하지 않고 편집 화면만 별도 창으로 연결합니다.
          </DocsListItem>
          <DocsListItem>
            2. 에디터의 <DocsCode>MAP_EDITOR_READY</DocsCode>를 받으면{" "}
            <DocsCode>MAP_EDITOR_INIT</DocsCode>으로 편집할 <DocsCode>scene</DocsCode>과
            편집 회차의 <DocsCode>sessionId</DocsCode>를 보냅니다. 좌표는 [경도,
            위도]이며, 기존 지도 데이터를 이 형식으로 변환합니다.
          </DocsListItem>
          <DocsListItem>
            3. <DocsCode>MAP_EDITOR_SUBMIT</DocsCode>의 결과를 검증한 뒤 편집 창을 닫고,
            서비스 데이터와 지도의 폴리곤을 갱신합니다.{" "}
            <DocsCode>MAP_EDITOR_CANCEL</DocsCode>이면 기존 데이터를 유지합니다.
          </DocsListItem>
        </DocsList>
        <Callout
          className="mt-4"
          tone="note"
          title="다른 주소에서도 연결할 수 있습니다"
        >
          HTTPS 사이트라면 에디터와 도메인이 달라도 연동할 수 있습니다. 기본 설정에서는
          별도 도메인 등록이 필요하지 않습니다. HTTP·로컬 개발 주소의 조건과 운영자가
          연결 사이트를 제한한 경우는{" "}
          <Link to="/integration#addresses">연결 가능한 주소와 조건</Link>에서
          확인하세요. 현재 직접 연 에디터는 입력을 기다립니다. 단독 실행은 검토 중이며
          이번 변경에 포함되지 않습니다.
        </Callout>
      </DocsSection>
      <DocsSection id="result" title="저장하면 무엇을 받나요?">
        <DocsText className="mb-4">
          ‘저장하고 편집 완료’를 누르면 <DocsCode>MAP_EDITOR_SUBMIT</DocsCode>으로 편집
          결과 전체를 받습니다. 현재 지도 데이터를 이 결과로 교체하면 다음 편집도 수정된
          권역에서 시작할 수 있습니다.
        </DocsText>
        <DocsTable
          label="편집 결과의 의미"
          headers={["에디터에서 한 일", "서비스가 받는 결과"]}
          rows={[
            {
              key: "edit",
              cells: [
                "폴리곤·정점을 수정",
                "수정된 geometry 좌표와 도형의 id·name·properties",
              ],
            },
            {
              key: "boundary",
              cells: [
                "행정동·법정동을 권역에 추가·합치기",
                "권역에 반영된 폴리곤. 단순히 조회한 참고 경계 전체는 포함하지 않음",
              ],
            },
            {
              key: "all",
              cells: [
                "편집을 완료",
                "변경된 도형만이 아닌 전체 features. 숨긴 도형도 포함",
              ],
            },
            {
              key: "cancel",
              cells: ["취소", "scene 없는 MAP_EDITOR_CANCEL. 기존 지도 데이터를 유지"],
            },
          ]}
        />
        <Callout
          className="mt-4"
          tone="note"
          title="결과 전달과 서비스 저장은 별개입니다"
        >
          완료 버튼은 편집 결과를 돌려주는 동작입니다. 데이터베이스 저장이 필요하면
          결과를 받은 서비스에서 자신의 저장 기능을 실행하세요.
        </Callout>
      </DocsSection>
      <DocsSection id="next" title="이어서 보기">
        <DocsTable
          label="사용·연동 문서 안내"
          headers={["하려는 작업", "문서", "확인할 내용"]}
          rows={[
            {
              key: "integration",
              cells: [
                "데이터를 보내고 결과 받기",
                <Link key="integration" to="/integration">
                  연동 인터페이스
                </Link>,
                "메시지·입출력 JSON, 새 창에 표시되는 내용, 서비스 연결 예제",
              ],
            },
            {
              key: "editing",
              cells: [
                "권역을 그리거나 경계로 조합하기",
                <Link key="editing" to="/editing">
                  편집 도구 안내
                </Link>,
                "그리기·경계 선택·합치기·빼기, 저장·취소",
              ],
            },
            {
              key: "demo",
              cells: [
                "전체 흐름을 직접 확인하기",
                <Link key="demo" to="/demo">
                  연동 데모
                </Link>,
                "입력 전달 → 새 창 편집 → 지도와 JSON 갱신",
              ],
            },
          ]}
        />
      </DocsSection>
    </DocsArticle>
  );
}
