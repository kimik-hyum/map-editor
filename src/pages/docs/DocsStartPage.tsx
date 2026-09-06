import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import {
  Callout,
  DocsArticle,
  DocsButton,
  DocsCode,
  DocsCodeBlock,
  DocsHero,
  DocsList,
  DocsListItem,
  DocsSection,
  DocsText,
} from "./components";
import { DocsTable } from "./components/DocsTable";

export function DocsStartPage() {
  return (
    <DocsArticle>
      <DocsHero
        eyebrow="Developer guide"
        id="overview"
        title="빠른 시작"
        description="부모 서비스가 도형을 보내고, 사용자가 편집한 결과를 돌려받는 팝업 지도 편집기입니다. 별도 SDK 설치 없이 postMessage로 연결합니다."
        actions={
          <DocsButton icon={ArrowRight} to="/demo">
            샘플 데이터로 실행
          </DocsButton>
        }
      />
      <DocsSection id="contract" title="연동 전에 알아둘 세 가지">
        <DocsList>
          <DocsListItem>
            입력과 출력은 <DocsCode>EditorSceneInput v2</DocsCode>입니다. GeoJSON
            FeatureCollection을 그대로 보내지 않고{" "}
            <DocsCode>version + features</DocsCode>로 감쌉니다.
          </DocsListItem>
          <DocsListItem>
            일반 편집은 비로그인으로 사용할 수 있습니다. 경계 데이터를 선택할 때만
            에디터가 Google 로그인을 요청합니다.
          </DocsListItem>
          <DocsListItem>
            에디터는 부모 서버에 저장하지 않습니다. 부모가 완료 결과를 검증한 뒤
            지도·폼에 반영하고, 필요하면 자신의 API로 저장합니다.
          </DocsListItem>
        </DocsList>
      </DocsSection>
      <DocsSection
        id="run"
        title="로컬에서 실행"
        description="Node.js 22 이상과 npm이 필요합니다. 저장소를 받은 뒤 프로젝트 루트에서 실행하세요."
      >
        <DocsCodeBlock
          code={"npm ci\nnpm run dev -- --port 4174"}
          language="bash"
          title="터미널"
        />
        <DocsText className="mt-4">
          <DocsCode>http://localhost:4174/demo</DocsCode>에서 ‘편집기 새 창으로 열기’를
          누르면 부모 데이터 수신부터 반환까지 확인할 수 있습니다. 경계 조회를 제외한
          편집·문서는 Supabase 설정 없이도 동작합니다.
        </DocsText>
        <Callout className="mt-4" tone="note" title="에디터 주소만 직접 열었다면">
          부모 창이 없으므로 데이터를 기다리는 화면이 표시됩니다.{" "}
          <Link to="/demo">데모</Link>에서 열거나 부모 서비스에서 INIT을 전달하세요.
        </Callout>
      </DocsSection>
      <DocsSection id="next" title="필요한 문서로 이동">
        <DocsTable
          label="개발자 문서 안내"
          headers={["하려는 작업", "문서", "확인할 내용"]}
          rows={[
            {
              key: "integration",
              cells: [
                "서비스에 편집기 연결",
                <Link key="integration" to="/integration">
                  부모 창 연동
                </Link>,
                "입력 형식, 메시지 검증, 실행 가능한 예제",
              ],
            },
            {
              key: "authentication",
              cells: [
                "경계 조회·배포 설정",
                <Link key="authentication" to="/authentication">
                  경계 데이터·인증
                </Link>,
                "로그인 시점, 공개 설정, callback, 접근 제한",
              ],
            },
            {
              key: "editing",
              cells: [
                "기능 범위·QA 확인",
                <Link key="editing" to="/editing">
                  편집 동작
                </Link>,
                "선택·그리기·연산, 저장 조건, 단축키",
              ],
            },
          ]}
        />
      </DocsSection>
    </DocsArticle>
  );
}
