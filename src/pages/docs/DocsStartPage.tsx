import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsHero,
  DocsSection,
  DocsText,
} from "./components";
import { DocsTable } from "./components/DocsTable";
import { DocsGyeongbokgungExample } from "./components/DocsGyeongbokgungExample";

export function DocsStartPage() {
  return (
    <DocsArticle>
      <DocsHero
        eyebrow="Termia 편집기 소개"
        id="overview"
        title="도형을 보내고, 편집 결과를 돌려받으세요"
        description="서비스 페이지에서 편집 창을 열고 도형 데이터를 보내세요. 사용자가 편집을 완료하면 결과가 원래 서비스 페이지로 전달됩니다. 받은 결과를 화면에 반영하거나 서버에 저장할 수 있습니다."
        actions={
          <>
            <DocsButton icon={ArrowRight} to="/integration">
              연동 인터페이스
            </DocsButton>
            <DocsButton href="#quickstart" variant="secondary">
              편집 흐름 체험하기
            </DocsButton>
          </>
        }
      />
      <DocsSection id="contract" title="서비스 페이지와 편집 창, 두 화면을 연결합니다">
        <DocsText className="mb-4">
          <strong>서비스 페이지</strong>는 여러분이 만드는 웹서비스의 화면입니다. 지도
          화면, 관리자 화면, 입력 폼에서 편집 버튼을 제공할 수 있습니다. 자바스크립트로
          데이터를 보내고 결과를 받을 수 있으면 됩니다.
        </DocsText>
        <DocsTable
          label="두 화면의 역할"
          headers={["화면", "하는 일"]}
          rows={[
            {
              key: "service",
              cells: [
                "서비스 페이지",
                "편집 창을 열고 편집할 데이터를 보냅니다. 편집 결과를 받아 자신의 화면과 데이터에 반영합니다.",
              ],
            },
            {
              key: "editor",
              cells: [
                "편집 창",
                "Termia 편집기가 열리는 새 창입니다. 받은 도형을 표시하고 편집 도구를 제공하며, 편집 완료 시 결과를 서비스 페이지로 보냅니다.",
              ],
            },
          ]}
        />
        <Callout
          className="mt-4"
          tone="note"
          title="다른 도메인의 서비스에서도 연결할 수 있습니다"
        >
          자바스크립트를 추가할 수 있는 HTTPS 웹서비스라면 도메인이 달라도 연결할 수
          있습니다. 공개 편집기의 기본 설정에서는 별도 도메인 등록이 필요하지 않습니다.
          HTTP·로컬 개발 주소는 <Link to="/integration#addresses">연결 조건</Link>을
          확인하세요.
        </Callout>
      </DocsSection>
      <DocsSection id="connect" title="열기 → 데이터 보내기 → 편집 결과 받기">
        <ol className="grid list-none grid-cols-3 gap-3 p-0 max-[680px]:grid-cols-1">
          <li className="rounded-lg border border-line bg-white p-4 text-sm leading-6">
            <strong className="mb-2 block text-brand-strong">1. 편집 창 열기</strong>
            서비스 페이지의 버튼을 누르면 편집 창이 열립니다. 원래 서비스 페이지는
            결과를 받을 때까지 열어 둡니다.
          </li>
          <li className="rounded-lg border border-line bg-white p-4 text-sm leading-6">
            <strong className="mb-2 block text-brand-strong">
              2. 편집할 데이터 보내기
            </strong>
            편집 창의 준비가 끝나면 정해진 JSON 형식으로 도형을 보냅니다. 빈 도형 목록을
            보내 새로 그리기부터 시작할 수도 있습니다.
          </li>
          <li className="rounded-lg border border-line bg-white p-4 text-sm leading-6">
            <strong className="mb-2 block text-brand-strong">3. 편집 결과 받기</strong>
            사용자가 편집을 완료하면 서비스 페이지가 최종 도형 목록을 받습니다. 취소하면
            서비스 페이지의 기존 데이터를 유지합니다.
          </li>
        </ol>
        <DocsText className="mt-3">
          점·선·다각형을 보낼 수 있으며, 기존 지도 라이브러리는 그대로 사용할 수
          있습니다. 서비스 개발자는 데이터 전송과 결과 처리를 연결합니다. Termia
          편집기의 설치·배포나 내부 코드 수정은 필요하지 않습니다.
        </DocsText>
      </DocsSection>
      <DocsSection
        id="result"
        title="편집 완료, 결과 반영, 서버 저장은 각각의 동작입니다"
      >
        <DocsTable
          label="완료와 저장의 차이"
          headers={["동작", "담당 화면", "결과"]}
          rows={[
            {
              key: "finish",
              cells: [
                "편집 완료",
                "편집 창",
                "최종 편집 데이터를 서비스 페이지로 보냅니다.",
              ],
            },
            {
              key: "apply",
              cells: [
                "결과 반영",
                "서비스 페이지",
                "받은 결과로 화면과 보관 중인 도형 데이터를 갱신합니다.",
              ],
            },
            {
              key: "persist",
              cells: [
                "서버에 저장",
                "서비스 페이지",
                "필요하면 자신의 저장 API를 호출해 결과를 영구 보관합니다.",
              ],
            },
          ]}
        />
        <DocsText className="mt-3">
          편집 결과에는 최종 도형 목록 전체가 들어갑니다. 삭제된 도형은 빠지고 숨긴
          도형은 포함됩니다. 참고로 조회한 경계는 사용자가 도형에 추가하거나 합친 부분만
          결과에 반영됩니다. 편집 창에서 완료했다고 서비스 서버에도 자동 저장되는 것은
          아닙니다.
        </DocsText>
      </DocsSection>
      <DocsSection
        id="quickstart"
        title="서비스 페이지로 결과가 돌아오는 흐름을 체험하세요"
      >
        <DocsText className="mb-4">
          아래 예제에서는 이 문서가 서비스 페이지 역할을 합니다. 편집 창으로 도형을
          보내고, 편집을 완료하면 받은 결과로 아래 지도와 JSON을 갱신합니다. 실제 편집
          창의 완료 버튼 이름은 ‘저장하고 편집 완료’입니다.
        </DocsText>
        <DocsGyeongbokgungExample />
        <DocsText className="mt-3">
          직접 그리기와 보낸 도형 편집은 로그인 없이 사용할 수 있습니다. 공개 편집기의
          참고 경계를 사용할 때 필요한 로그인은 편집 창에서 안내합니다.
        </DocsText>
      </DocsSection>
      <DocsSection id="terms" title="이 문서에서 사용하는 용어">
        <DocsTable
          label="편집기 문서 용어"
          headers={["용어", "뜻"]}
          rows={[
            {
              key: "data",
              cells: ["편집 데이터", "편집할 도형 목록과 관련 설정을 담은 데이터 전체"],
            },
            {
              key: "feature",
              cells: [
                "도형",
                "점·선·다각형 하나. 도형 여러 개를 묶어 도형 목록이라고 합니다.",
              ],
            },
            {
              key: "result",
              cells: [
                "편집 결과",
                "편집을 마친 뒤 서비스 페이지가 돌려받는 전체 편집 데이터",
              ],
            },
            {
              key: "boundary",
              cells: [
                "참고 경계",
                "도형을 만들거나 수정할 때 참고하는 행정동·법정동·우편번호 등의 경계",
              ],
            },
            {
              key: "area",
              cells: ["권역", "배송구역·영업구역처럼 서비스에서 관리하는 구역"],
            },
          ]}
        />
      </DocsSection>
      <DocsSection id="next" title="다음으로 필요한 안내를 선택하세요">
        <DocsTable
          label="문서 길잡이"
          headers={["하려는 일", "안내"]}
          rows={[
            {
              key: "connect",
              cells: [
                "편집할 데이터를 보내고 결과 처리하기",
                <Link key="connect" to="/integration#example">
                  서비스 페이지에 연결하는 코드 예제
                </Link>,
              ],
            },
            {
              key: "tools",
              cells: [
                "도형을 그리고 수정하는 방법 알아보기",
                <Link key="tools" to="/editing">
                  편집 도구 안내
                </Link>,
              ],
            },
            {
              key: "demo",
              cells: [
                "지도 화면에 편집 결과를 반영하는 예제 보기",
                <Link key="demo" to="/demo">
                  지도 연동 데모
                </Link>,
              ],
            },
            {
              key: "hosting",
              cells: [
                "편집기를 직접 배포하거나 내부 기능 바꾸기",
                <Link key="hosting" to="/self-hosting">
                  직접 운영·커스텀
                </Link>,
              ],
            },
          ]}
        />
      </DocsSection>
    </DocsArticle>
  );
}
