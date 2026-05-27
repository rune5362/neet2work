import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

type DocumentItem = {
  id: string;
  type: "Resume" | "Cover Letter" | "Profile";
  title: string;
  updatedAt: string;
  status: "작성중" | "검토 완료" | "AI 개선안 있음";
  target: string;
  summary: string;
  keywords: string[];
};

const DOCUMENTS: DocumentItem[] = [
  {
    id: "resume-frontend-2026",
    type: "Resume",
    title: "프론트엔드 개발자 이력서",
    updatedAt: "2026.05.24",
    status: "AI 개선안 있음",
    target: "React / TypeScript 직무",
    summary: "프로젝트 성과와 기술 스택을 중심으로 정리한 기본 이력서입니다.",
    keywords: ["React", "TypeScript", "성능 개선"]
  },
  {
    id: "cover-letter-node",
    type: "Cover Letter",
    title: "Node.js 백엔드 지원 자기소개서",
    updatedAt: "2026.05.21",
    status: "검토 완료",
    target: "REST API / Docker 직무",
    summary: "백엔드 API 설계 경험과 운영 환경 개선 경험을 강조한 자기소개서입니다.",
    keywords: ["Node.js", "Express", "Docker"]
  },
  {
    id: "resume-career-transition",
    type: "Resume",
    title: "커리어 전환용 이력서",
    updatedAt: "2026.05.18",
    status: "작성중",
    target: "AI 서비스 기획형 개발자",
    summary: "공백기 프로젝트와 데이터 분석 경험을 하나의 흐름으로 묶는 중입니다.",
    keywords: ["AI", "Data Analysis", "Prompt Engineering"]
  },
  {
    id: "profile-career-summary",
    type: "Profile",
    title: "개발자 커리어 프로필",
    updatedAt: "2026.05.16",
    status: "검토 완료",
    target: "서비스 개발 포지션 공통",
    summary: "핵심 기술, 선호 직무, 프로젝트 이력을 빠르게 검토할 수 있는 공개용 프로필입니다.",
    keywords: ["Profile", "Career Summary", "Portfolio"]
  }
];

export function Documents() {
  return (
    <main className="documentsPage">
      <HomeTopNav />

      <section className="documentsContent">
        <header className="documentsHeader">
          <span>보관함</span>
          <div>
            <p>작성 중인 문서, AI 분석이 필요한 문서, 검토가 끝난 문서를 목록으로 확인할 수 있습니다.</p>
          </div>
          <button type="button">새 문서 만들기</button>
        </header>

        <div className="documentsToolbar" aria-label="문서 필터">
          <button className="active" type="button">
            전체
          </button>
          <button type="button">Resume</button>
          <button type="button">Cover Letter</button>
          <button type="button">Profile</button>
        </div>

        <section className="documentsList" aria-label="보관 문서 목록">
          {DOCUMENTS.map((document) => (
            <article className="documentsCard" key={document.id}>
              <div className="documentsCardType">{document.type}</div>
              <div className="documentsCardBody">
                <div>
                  <h2>{document.title}</h2>
                  <span>{document.updatedAt} 업데이트</span>
                </div>
                <p>{document.summary}</p>
                <div className="documentsTags">
                  {document.keywords.map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              </div>
              <div className="documentsCardMeta">
                <span>{document.status}</span>
                <strong>{document.target}</strong>
                <button type="button">열기</button>
              </div>
            </article>
          ))}
        </section>
      </section>

      <HomeFooter />
    </main>
  );
}
