import { useMemo, useState, type ReactNode } from "react";
import logoUrl from "./assets/logo/neet2work_logo_lockup_reference_curve 1.png";

type ConceptId = "a" | "b" | "c";
type ViewMode = "board" | "cards";
type DemoState = "ready" | "loading" | "empty" | "error";
type SortKey = "latest" | "views" | "priority";
type Status = "검수중" | "게시됨" | "마감임박" | "보류";
type Category = "프론트엔드" | "백엔드" | "데이터" | "디자인" | "인프라" | "기획";

type FeedItem = {
  id: number;
  title: string;
  author: string;
  createdAt: string;
  views: number;
  status: Status;
  category: Category;
  summary: string;
  icon: string;
  priority: number;
  tags: string[];
};

const statuses: Status[] = ["검수중", "게시됨", "마감임박", "보류"];
const categories: Category[] = ["프론트엔드", "백엔드", "데이터", "디자인", "인프라", "기획"];

const feedItems: FeedItem[] = [
  makeItem(1, "React 기반 채용공고 피드 개선", "김서윤", "2026-05-15", 1284, "게시됨", "프론트엔드", 95, ["React", "UI", "성능"]),
  makeItem(2, "AI 매칭 점수 산정 규칙 검토", "박준호", "2026-05-15", 973, "검수중", "데이터", 89, ["LLM", "분석", "품질"]),
  makeItem(3, "Spring API 응답 캐시 전략", "이민재", "2026-05-14", 1440, "게시됨", "백엔드", 91, ["API", "Cache", "DB"]),
  makeItem(4, "모바일 공고 상세 전환율 개선", "최하린", "2026-05-14", 884, "마감임박", "기획", 86, ["Mobile", "CTA", "UX"]),
  makeItem(5, "접근성 기준에 맞춘 필터 폼", "정다은", "2026-05-13", 621, "검수중", "디자인", 80, ["A11y", "Form", "Label"]),
  makeItem(6, "Kubernetes 배포 상태 대시보드", "문태오", "2026-05-13", 533, "보류", "인프라", 72, ["K8s", "Ops", "Deploy"]),
  makeItem(7, "경력별 공고 추천 슬롯", "한유진", "2026-05-12", 1102, "게시됨", "기획", 93, ["추천", "세그먼트", "AB"]),
  makeItem(8, "TypeScript 타입 안정성 리포트", "오지훈", "2026-05-12", 798, "게시됨", "프론트엔드", 84, ["TS", "Lint", "품질"]),
  makeItem(9, "검색어 하이라이트 정책", "서아름", "2026-05-11", 459, "검수중", "프론트엔드", 78, ["Search", "UX", "Text"]),
  makeItem(10, "채용공고 중복 제거 배치", "강도윤", "2026-05-11", 1502, "게시됨", "데이터", 97, ["Batch", "ETL", "Dedup"]),
  makeItem(11, "지원자 액션 로그 수집", "배수현", "2026-05-10", 692, "마감임박", "백엔드", 82, ["Log", "Event", "API"]),
  makeItem(12, "공고 카드 썸네일 체계", "윤지안", "2026-05-10", 733, "게시됨", "디자인", 88, ["Card", "Icon", "Token"]),
  makeItem(13, "대량 목록 가상화 기준", "권하늘", "2026-05-09", 1811, "검수중", "프론트엔드", 99, ["Virtual", "List", "Perf"]),
  makeItem(14, "관리자 승인 플로우 단순화", "임서준", "2026-05-09", 537, "보류", "기획", 70, ["Admin", "Flow", "Review"]),
  makeItem(15, "R2 이력서 파일 정책", "신예린", "2026-05-08", 476, "검수중", "인프라", 74, ["Storage", "Policy", "File"]),
  makeItem(16, "공고 원문 크롤링 실패 처리", "조현우", "2026-05-08", 1288, "마감임박", "백엔드", 85, ["Crawler", "Retry", "Error"]),
  makeItem(17, "카테고리별 인기 직무 분석", "남지우", "2026-05-07", 934, "게시됨", "데이터", 87, ["Metric", "Trend", "SQL"]),
  makeItem(18, "디자인 토큰 CSS 변수화", "류민서", "2026-05-07", 665, "검수중", "디자인", 81, ["Token", "CSS", "System"]),
  makeItem(19, "지원 마감 알림 큐", "장태민", "2026-05-06", 1196, "게시됨", "백엔드", 90, ["Queue", "Notify", "Cron"]),
  makeItem(20, "검색 결과 빈 상태 문구", "차유나", "2026-05-06", 382, "게시됨", "기획", 76, ["Empty", "Copy", "UX"]),
  makeItem(21, "관리자 테이블 정렬 기준", "백시온", "2026-05-05", 814, "검수중", "프론트엔드", 83, ["Table", "Sort", "Admin"]),
  makeItem(22, "로그인 없는 공개 공고 뷰", "이지호", "2026-05-05", 1033, "게시됨", "백엔드", 88, ["Public", "Auth", "API"]),
  makeItem(23, "상태 배지 색상 대비 검토", "홍다인", "2026-05-04", 544, "보류", "디자인", 71, ["Badge", "Contrast", "A11y"]),
  makeItem(24, "원격 근무 필터 추가", "민준석", "2026-05-04", 721, "마감임박", "기획", 79, ["Filter", "Remote", "Search"]),
  makeItem(25, "공고 상세 메타데이터 표준화", "고아린", "2026-05-03", 632, "게시됨", "데이터", 82, ["Schema", "Meta", "Data"]),
  makeItem(26, "Docker preview 환경 정리", "허도현", "2026-05-03", 468, "검수중", "인프라", 73, ["Docker", "Preview", "Env"]),
  makeItem(27, "카드형 목록 더보기 UX", "손유림", "2026-05-02", 1109, "게시됨", "프론트엔드", 92, ["Load More", "Grid", "Mobile"]),
  makeItem(28, "공고 신고 처리 화면", "마서준", "2026-05-02", 349, "보류", "기획", 69, ["Report", "Moderation", "Admin"]),
  makeItem(29, "키워드 추출 정확도 점검", "유나경", "2026-05-01", 1548, "마감임박", "데이터", 94, ["Keyword", "NLP", "Quality"]),
  makeItem(30, "빌드 실패 알림 개선", "노현빈", "2026-05-01", 587, "검수중", "인프라", 77, ["Build", "Alert", "CI"]),
  makeItem(31, "공고 북마크 액션 추적", "전서연", "2026-04-30", 902, "게시됨", "백엔드", 86, ["Bookmark", "Event", "API"]),
  makeItem(32, "랜딩 히어로 정보 구조 개선", "양태겸", "2026-04-30", 699, "검수중", "디자인", 80, ["Hero", "IA", "CTA"])
];

function makeItem(
  id: number,
  title: string,
  author: string,
  createdAt: string,
  views: number,
  status: Status,
  category: Category,
  priority: number,
  tags: string[]
): FeedItem {
  return {
    id,
    title,
    author,
    createdAt,
    views,
    status,
    category,
    priority,
    tags,
    icon: category.slice(0, 1),
    summary: `${category} 관점에서 ${title} 항목을 검토하고 운영자가 바로 판단할 수 있도록 핵심 근거와 후속 액션을 정리합니다.`
  };
}

export default function App() {
  const concept = getConcept();
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [demoState, setDemoState] = useState<DemoState>("ready");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"전체" | Category>("전체");
  const [status, setStatus] = useState<"전체" | Status>("전체");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [page, setPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(12);

  const filteredItems = useMemo(() => {
    if (demoState !== "ready") {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const result = feedItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.title, item.author, item.summary, item.category, item.status, ...item.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory = category === "전체" || item.category === category;
      const matchesStatus = status === "전체" || item.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });

    return result.sort((a, b) => {
      if (sortKey === "views") {
        return b.views - a.views;
      }
      if (sortKey === "priority") {
        return b.priority - a.priority;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [category, demoState, query, sortKey, status]);

  const actions = {
    viewMode,
    setViewMode,
    demoState,
    setDemoState,
    query,
    setQuery,
    category,
    setCategory,
    status,
    setStatus,
    sortKey,
    setSortKey,
    page,
    setPage,
    visibleCount,
    setVisibleCount,
    filteredItems
  };

  if (concept === "b") {
    return <MarketplaceConcept {...actions} />;
  }

  if (concept === "c") {
    return <DashboardConcept {...actions} />;
  }

  return <SaasConcept {...actions} />;
}

function getConcept(): ConceptId {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.includes("concept-b")) {
    return "b";
  }
  if (pathname.includes("concept-c")) {
    return "c";
  }
  return "a";
}

type ConceptProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  demoState: DemoState;
  setDemoState: (state: DemoState) => void;
  query: string;
  setQuery: (value: string) => void;
  category: "전체" | Category;
  setCategory: (value: "전체" | Category) => void;
  status: "전체" | Status;
  setStatus: (value: "전체" | Status) => void;
  sortKey: SortKey;
  setSortKey: (value: SortKey) => void;
  page: number;
  setPage: (value: number) => void;
  visibleCount: number;
  setVisibleCount: (value: number) => void;
  filteredItems: FeedItem[];
};

function SaasConcept(props: ConceptProps) {
  return (
    <main className="page pageA">
      <AppNav active="a" />
      <section className="aHero">
        <div className="heroCopy">
          <p className="eyebrow">A안 · 신뢰감 있는 SaaS 스타일</p>
          <h1>채용 게시글을 검수하고 우선순위를 결정하는 운영 콘솔</h1>
          <p>
            서버에서 수집한 채용 게시글을 신뢰 가능한 업무 피드로 정리합니다. 검색, 필터, 정렬, 상태 확인을 첫 화면에서
            처리하도록 설계했습니다.
          </p>
          <div className="heroActions">
            <a className="primaryAction" href="#content">
              게시글 검토 시작
            </a>
            <a className="outlineAction" href="/concept-b">
              마켓형 비교
            </a>
          </div>
        </div>
        <MetricPanel />
      </section>

      <section className="aLayout" id="content">
        <aside className="optionPanel">
          <h2>페이지 옵션</h2>
          <Controls {...props} variant="stacked" />
        </aside>
        <ContentFrame {...props} concept="a" />
      </section>
      <FooterBand />
    </main>
  );
}

function MarketplaceConcept(props: ConceptProps) {
  const promotedItems = props.filteredItems.slice(0, 3);

  return (
    <main className="page pageB">
      <AppNav active="b" />
      <section className="bHero">
        <div>
          <p className="eyebrow">B안 · 커머스/마켓플레이스 스타일</p>
          <h1>채용 게시글을 상품처럼 탐색하고 저장하는 마켓</h1>
          <p>
            게시글의 카테고리, 상태, 조회수, 우선순위를 카드 상품 정보처럼 배치합니다. 사용자는 관심 게시글을 빠르게
            비교하고 저장할 수 있습니다.
          </p>
        </div>
        <div className="dealRail" aria-label="추천 게시글">
          {promotedItems.length > 0 ? (
            promotedItems.map((item) => (
              <article key={item.id}>
                <span>{item.status}</span>
                <strong>{item.title}</strong>
                <p>{item.author} · 조회 {item.views.toLocaleString()}</p>
              </article>
            ))
          ) : (
            <article>
              <span>상태 확인</span>
              <strong>추천 게시글이 없습니다</strong>
              <p>데이터 상태를 ready로 전환하세요.</p>
            </article>
          )}
        </div>
      </section>

      <section className="marketToolbar">
        <Controls {...props} variant="inline" />
      </section>

      <section className="bLayout" id="content">
        <CategoryRail category={props.category} setCategory={props.setCategory} />
        <ContentFrame {...props} concept="b" />
      </section>
      <FooterBand />
    </main>
  );
}

function DashboardConcept(props: ConceptProps) {
  return (
    <main className="page pageC">
      <AppNav active="c" />
      <section className="dashShell">
        <aside className="dashNav" aria-label="관리자 메뉴">
          <strong>JobBoard Ops</strong>
          {["수집함", "검수 대기", "게시 승인", "통계"].map((item) => (
            <a href="#content" key={item}>
              {item}
            </a>
          ))}
        </aside>
        <div className="dashMain">
          <section className="dashHero">
            <div>
              <p className="eyebrow">C안 · 대시보드/관리자 스타일</p>
              <h1>대량 게시글의 상태, 품질, 트래픽을 한 번에 관리</h1>
              <p>운영자는 게시 상태와 조회수를 기준으로 우선순위를 정하고, 게시판과 카드 피드를 같은 데이터로 검증합니다.</p>
            </div>
            <StateSwitch demoState={props.demoState} setDemoState={props.setDemoState} />
          </section>
          <MetricPanel compact />
          <section className="dashControls">
            <Controls {...props} variant="inline" hideStateSwitch />
          </section>
          <ContentFrame {...props} concept="c" />
        </div>
      </section>
    </main>
  );
}

function AppNav({ active }: { active: ConceptId }) {
  return (
    <header className="appHeader">
      <a className="brand" href="/concept-a" aria-label="Neet2Work 시안 홈">
        <img src={logoUrl} alt="Neet2Work" />
      </a>
      <nav aria-label="시안 선택">
        <a className={active === "a" ? "active" : ""} href="/concept-a">
          SaaS
        </a>
        <a className={active === "b" ? "active" : ""} href="/concept-b">
          Marketplace
        </a>
        <a className={active === "c" ? "active" : ""} href="/concept-c">
          Dashboard
        </a>
      </nav>
    </header>
  );
}

function MetricPanel({ compact = false }: { compact?: boolean }) {
  const metrics = [
    ["전체 게시글", feedItems.length.toString(), "동일 mock data"],
    ["게시 가능", feedItems.filter((item) => item.status === "게시됨").length.toString(), "승인 완료"],
    ["평균 우선순위", `${Math.round(feedItems.reduce((sum, item) => sum + item.priority, 0) / feedItems.length)}점`, "정렬 기준"],
    ["총 조회수", feedItems.reduce((sum, item) => sum + item.views, 0).toLocaleString(), "테스트 데이터"]
  ];

  return (
    <aside className={compact ? "metricPanel compact" : "metricPanel"} aria-label="게시글 지표">
      {metrics.map(([label, value, caption]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <p>{caption}</p>
        </article>
      ))}
    </aside>
  );
}

function Controls({
  viewMode,
  setViewMode,
  demoState,
  setDemoState,
  query,
  setQuery,
  category,
  setCategory,
  status,
  setStatus,
  sortKey,
  setSortKey,
  setPage,
  setVisibleCount,
  variant,
  hideStateSwitch = false
}: ConceptProps & { variant: "stacked" | "inline"; hideStateSwitch?: boolean }) {
  function resetPage() {
    setPage(1);
    setVisibleCount(12);
  }

  return (
    <div className={`controls ${variant}`}>
      <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      {!hideStateSwitch ? <StateSwitch demoState={demoState} setDemoState={setDemoState} /> : null}
      <form className="filterForm" onSubmit={(event) => event.preventDefault()}>
        <label>
          <span>검색어</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="제목, 작성자, 태그 검색"
          />
        </label>
        <label>
          <span>카테고리</span>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as "전체" | Category);
              resetPage();
            }}
          >
            <option>전체</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>상태</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as "전체" | Status);
              resetPage();
            }}
          >
            <option>전체</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>정렬</span>
          <select
            value={sortKey}
            onChange={(event) => {
              setSortKey(event.target.value as SortKey);
              resetPage();
            }}
          >
            <option value="latest">최신순</option>
            <option value="views">조회순</option>
            <option value="priority">우선순위순</option>
          </select>
        </label>
      </form>
    </div>
  );
}

function ViewToggle({
  viewMode,
  setViewMode
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  return (
    <div className="segmented" aria-label="보기 방식">
      <button type="button" className={viewMode === "board" ? "active" : ""} onClick={() => setViewMode("board")}>
        레거시 게시판
      </button>
      <button type="button" className={viewMode === "cards" ? "active" : ""} onClick={() => setViewMode("cards")}>
        리싸이클 카드
      </button>
    </div>
  );
}

function StateSwitch({
  demoState,
  setDemoState
}: {
  demoState: DemoState;
  setDemoState: (state: DemoState) => void;
}) {
  const states: Array<[DemoState, string]> = [
    ["ready", "데이터"],
    ["loading", "로딩"],
    ["empty", "빈 상태"],
    ["error", "에러"]
  ];

  return (
    <div className="stateSwitch" aria-label="상태 시뮬레이션">
      {states.map(([state, label]) => (
        <button key={state} type="button" className={demoState === state ? "active" : ""} onClick={() => setDemoState(state)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CategoryRail({
  category,
  setCategory
}: {
  category: "전체" | Category;
  setCategory: (category: "전체" | Category) => void;
}) {
  return (
    <aside className="categoryRail" aria-label="마켓 카테고리">
      <h2>카테고리</h2>
      {(["전체", ...categories] as Array<"전체" | Category>).map((item) => (
        <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>
          {item}
        </button>
      ))}
    </aside>
  );
}

function ContentFrame(props: ConceptProps & { concept: ConceptId }) {
  const { demoState, viewMode, filteredItems } = props;

  if (demoState === "loading") {
    return (
      <StatePanel title="게시글을 불러오는 중입니다" tone="loading">
        서버에서 목록을 받는 동안 현재 검색 조건과 보기 방식은 유지됩니다.
      </StatePanel>
    );
  }

  if (demoState === "error") {
    return (
      <StatePanel title="게시글 목록을 가져오지 못했습니다" tone="error">
        네트워크 또는 API 응답을 확인하세요. 오류는 색상뿐 아니라 문구와 역할 속성으로도 전달됩니다.
      </StatePanel>
    );
  }

  if (demoState === "empty" || filteredItems.length === 0) {
    return (
      <StatePanel title="조건에 맞는 게시글이 없습니다" tone="empty">
        검색어를 줄이거나 필터를 전체로 변경하면 다시 결과를 확인할 수 있습니다.
      </StatePanel>
    );
  }

  return viewMode === "board" ? <LegacyBoard {...props} /> : <RecycleCards {...props} />;
}

function StatePanel({ title, tone, children }: { title: string; tone: "loading" | "empty" | "error"; children: ReactNode }) {
  return (
    <section className={`statePanel ${tone}`} role={tone === "error" ? "alert" : "status"} aria-live="polite">
      <strong>{title}</strong>
      <p>{children}</p>
    </section>
  );
}

function LegacyBoard({ filteredItems, page, setPage, concept }: ConceptProps & { concept: ConceptId }) {
  const pageSize = concept === "c" ? 8 : 6;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className={`boardSurface board${concept.toUpperCase()}`} aria-label="레거시 게시판 뷰">
      <div className="boardHeader">
        <h2>레거시 게시판</h2>
        <span>
          {filteredItems.length.toLocaleString()}개 중 {pagedItems.length}개 표시
        </span>
      </div>
      <div className="boardTable" role="table" aria-label="게시글 목록">
        <div className="boardRow boardHead" role="row">
          <span role="columnheader">번호</span>
          <span role="columnheader">제목</span>
          <span role="columnheader">작성자</span>
          <span role="columnheader">작성일</span>
          <span role="columnheader">조회수</span>
          <span role="columnheader">상태/카테고리</span>
        </div>
        {pagedItems.map((item) => (
          <article className="boardRow" role="row" key={item.id}>
            <span role="cell">{item.id}</span>
            <strong role="cell">{item.title}</strong>
            <span role="cell">{item.author}</span>
            <time role="cell" dateTime={item.createdAt}>
              {item.createdAt}
            </time>
            <span role="cell">{item.views.toLocaleString()}</span>
            <span role="cell">
              <StatusBadge status={item.status} /> {item.category}
            </span>
          </article>
        ))}
      </div>
      <div className="pagination" aria-label="게시판 페이지네이션">
        <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>
          이전
        </button>
        <span>
          {safePage} / {pageCount}
        </span>
        <button type="button" onClick={() => setPage(Math.min(pageCount, safePage + 1))} disabled={safePage === pageCount}>
          다음
        </button>
      </div>
    </section>
  );
}

function RecycleCards({
  filteredItems,
  visibleCount,
  setVisibleCount,
  concept
}: ConceptProps & { concept: ConceptId }) {
  const visibleItems = filteredItems.slice(0, visibleCount);

  return (
    <section className={`cardSurface cards${concept.toUpperCase()}`} aria-label="리싸이클 카드뷰">
      <div className="boardHeader">
        <h2>리싸이클 카드뷰</h2>
        <span>
          {visibleItems.length} / {filteredItems.length}개 표시
        </span>
      </div>
      <div className="cardGrid">
        {visibleItems.map((item) => (
          <article className="feedCard" key={item.id}>
            <div className="thumb" aria-hidden="true">
              {item.icon}
            </div>
            <div className="cardMeta">
              <StatusBadge status={item.status} />
              <span>{item.category}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <dl>
              <div>
                <dt>작성자</dt>
                <dd>{item.author}</dd>
              </div>
              <div>
                <dt>날짜</dt>
                <dd>{item.createdAt}</dd>
              </div>
              <div>
                <dt>조회</dt>
                <dd>{item.views.toLocaleString()}</dd>
              </div>
            </dl>
            <div className="tagList">
              {item.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div className="cardActions">
              <button type="button" aria-label={`${item.title} 상세 보기`}>
                상세
              </button>
              <button type="button" aria-label={`${item.title} 저장`}>
                저장
              </button>
            </div>
          </article>
        ))}
      </div>
      {visibleItems.length < filteredItems.length ? (
        <button className="loadMore" type="button" onClick={() => setVisibleCount(visibleCount + 8)}>
          더 보기
        </button>
      ) : null}
    </section>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`statusBadge status-${status}`}>{status}</span>;
}

function FooterBand() {
  return (
    <footer className="footerBand">
      <div>
        <h2>검토 후 선택한 시안을 실제 데이터 API에 연결</h2>
        <p>현재 화면은 동일 mock data로 기능과 반응형 UX를 먼저 확인하기 위한 시안입니다.</p>
      </div>
      <a className="primaryAction" href="/concept-a">
        A안으로 돌아가기
      </a>
    </footer>
  );
}
