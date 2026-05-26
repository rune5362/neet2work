import { type ReactNode, useEffect, useMemo, useState } from "react";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

type JobListing = {
  id: string;
  icon: string;
  isNew: boolean;
  title: string;
  company: string;
  source: string;
  category: string;
  country: string;
  language: string;
  workLocation: WorkLocation;
  location: string;
  salary?: string;
  experience: string;
  jobType: string;
  deadline: string;
  skills: string[];
  description: string;
};

type ActiveFilter = {
  key: string;
  value: string;
  onClear: () => void;
};

type WorkLocation = {
  country: string;
  region1?: string;
  region2?: string;
  region3?: string;
};

type LocationTree = {
  country: string;
  regions: {
    name: string;
    cities: {
      name: string;
      districts?: string[];
    }[];
  }[];
};

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

function FilterSelect({ label, value, onChange, children }: FilterSelectProps) {
  return (
    <label className="jobsFilterControlWrap">
      <span>{label}</span>
      <select
        className="jobsFilterControl"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
      <FilterChevronIcon />
    </label>
  );
}

function FilterChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="jobsFilterChevron"
      fill="none"
      focusable="false"
      viewBox="0 0 20 20"
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

const locationTree: LocationTree[] = [
  {
    country: "한국",
    regions: [
      {
        name: "서울특별시",
        cities: [
          { name: "강남구" },
          { name: "강동구" },
          { name: "강북구" },
          { name: "강서구" },
          { name: "관악구" },
          { name: "광진구" },
          { name: "구로구" },
          { name: "금천구" },
          { name: "노원구" },
          { name: "도봉구" },
          { name: "동대문구" },
          { name: "동작구" },
          { name: "마포구" },
          { name: "서대문구" },
          { name: "서초구" },
          { name: "성동구" },
          { name: "성북구" },
          { name: "송파구" },
          { name: "양천구" },
          { name: "영등포구" },
          { name: "용산구" },
          { name: "은평구" },
          { name: "종로구" },
          { name: "중구" },
          { name: "중랑구" }
        ]
      },
      {
        name: "부산광역시",
        cities: [
          { name: "중구" },
          { name: "서구" },
          { name: "동구" },
          { name: "영도구" },
          { name: "부산진구" },
          { name: "동래구" },
          { name: "남구" },
          { name: "북구" },
          { name: "해운대구" },
          { name: "사하구" },
          { name: "금정구" },
          { name: "강서구" },
          { name: "연제구" },
          { name: "수영구" },
          { name: "사상구" },
          { name: "기장군" }
        ]
      },
      {
        name: "대구광역시",
        cities: [
          { name: "중구" },
          { name: "동구" },
          { name: "서구" },
          { name: "남구" },
          { name: "북구" },
          { name: "수성구" },
          { name: "달서구" },
          { name: "달성군" },
          { name: "군위군" }
        ]
      },
      {
        name: "인천광역시",
        cities: [
          { name: "중구" },
          { name: "동구" },
          { name: "미추홀구" },
          { name: "연수구" },
          { name: "남동구" },
          { name: "부평구" },
          { name: "계양구" },
          { name: "서구" },
          { name: "강화군" },
          { name: "옹진군" }
        ]
      },
      {
        name: "광주광역시",
        cities: [
          { name: "동구" },
          { name: "서구" },
          { name: "남구" },
          { name: "북구" },
          { name: "광산구" }
        ]
      },
      {
        name: "대전광역시",
        cities: [
          { name: "동구" },
          { name: "중구" },
          { name: "서구" },
          { name: "유성구" },
          { name: "대덕구" }
        ]
      },
      {
        name: "울산광역시",
        cities: [
          { name: "중구" },
          { name: "남구" },
          { name: "동구" },
          { name: "북구" },
          { name: "울주군" }
        ]
      },
      {
        name: "세종특별자치시",
        cities: [{ name: "세종시" }]
      },
      {
        name: "경기도",
        cities: [
          { name: "성남시", districts: ["분당구", "수정구", "중원구"] },
          { name: "수원시", districts: ["영통구", "팔달구", "장안구", "권선구"] },
          { name: "고양시", districts: ["일산동구", "일산서구", "덕양구"] },
          { name: "용인시", districts: ["수지구", "기흥구", "처인구"] },
          { name: "의정부시" },
          { name: "안양시", districts: ["동안구", "만안구"] },
          { name: "부천시" },
          { name: "광명시" },
          { name: "동두천시" },
          { name: "안산시", districts: ["상록구", "단원구"] },
          { name: "과천시" },
          { name: "구리시" },
          { name: "남양주시" },
          { name: "오산시" },
          { name: "시흥시" },
          { name: "군포시" },
          { name: "의왕시" },
          { name: "하남시" },
          { name: "파주시" },
          { name: "이천시" },
          { name: "안성시" },
          { name: "김포시" },
          { name: "화성시" },
          { name: "평택시" },
          { name: "광주시" },
          { name: "양주시" },
          { name: "포천시" },
          { name: "여주시" },
          { name: "연천군" },
          { name: "가평군" },
          { name: "양평군" }
        ]
      },
      {
        name: "강원특별자치도",
        cities: [
          { name: "춘천시" },
          { name: "원주시" },
          { name: "강릉시" },
          { name: "동해시" },
          { name: "태백시" },
          { name: "속초시" },
          { name: "삼척시" },
          { name: "홍천군" },
          { name: "횡성군" },
          { name: "영월군" },
          { name: "평창군" },
          { name: "정선군" },
          { name: "철원군" },
          { name: "화천군" },
          { name: "양구군" },
          { name: "인제군" },
          { name: "고성군" },
          { name: "양양군" }
        ]
      },
      {
        name: "충청북도",
        cities: [
          { name: "청주시", districts: ["상당구", "서원구", "흥덕구", "청원구"] },
          { name: "충주시" },
          { name: "제천시" },
          { name: "보은군" },
          { name: "옥천군" },
          { name: "영동군" },
          { name: "증평군" },
          { name: "진천군" },
          { name: "괴산군" },
          { name: "음성군" },
          { name: "단양군" }
        ]
      },
      {
        name: "충청남도",
        cities: [
          { name: "천안시", districts: ["동남구", "서북구"] },
          { name: "공주시" },
          { name: "보령시" },
          { name: "아산시" },
          { name: "서산시" },
          { name: "논산시" },
          { name: "계룡시" },
          { name: "당진시" },
          { name: "금산군" },
          { name: "부여군" },
          { name: "서천군" },
          { name: "청양군" },
          { name: "홍성군" },
          { name: "예산군" },
          { name: "태안군" }
        ]
      },
      {
        name: "전북특별자치도",
        cities: [
          { name: "전주시", districts: ["완산구", "덕진구"] },
          { name: "군산시" },
          { name: "익산시" },
          { name: "정읍시" },
          { name: "남원시" },
          { name: "김제시" },
          { name: "완주군" },
          { name: "진안군" },
          { name: "무주군" },
          { name: "장수군" },
          { name: "임실군" },
          { name: "순창군" },
          { name: "고창군" },
          { name: "부안군" }
        ]
      },
      {
        name: "전라남도",
        cities: [
          { name: "목포시" },
          { name: "여수시" },
          { name: "순천시" },
          { name: "나주시" },
          { name: "광양시" },
          { name: "담양군" },
          { name: "곡성군" },
          { name: "구례군" },
          { name: "고흥군" },
          { name: "보성군" },
          { name: "화순군" },
          { name: "장흥군" },
          { name: "강진군" },
          { name: "해남군" },
          { name: "영암군" },
          { name: "무안군" },
          { name: "함평군" },
          { name: "영광군" },
          { name: "장성군" },
          { name: "완도군" },
          { name: "진도군" },
          { name: "신안군" }
        ]
      },
      {
        name: "경상북도",
        cities: [
          { name: "포항시", districts: ["남구", "북구"] },
          { name: "경주시" },
          { name: "김천시" },
          { name: "안동시" },
          { name: "구미시" },
          { name: "영주시" },
          { name: "영천시" },
          { name: "상주시" },
          { name: "문경시" },
          { name: "경산시" },
          { name: "의성군" },
          { name: "청송군" },
          { name: "영양군" },
          { name: "영덕군" },
          { name: "청도군" },
          { name: "고령군" },
          { name: "성주군" },
          { name: "칠곡군" },
          { name: "예천군" },
          { name: "봉화군" },
          { name: "울진군" },
          { name: "울릉군" }
        ]
      },
      {
        name: "경상남도",
        cities: [
          { name: "창원시", districts: ["의창구", "성산구", "마산합포구", "마산회원구", "진해구"] },
          { name: "진주시" },
          { name: "통영시" },
          { name: "사천시" },
          { name: "김해시" },
          { name: "밀양시" },
          { name: "거제시" },
          { name: "양산시" },
          { name: "의령군" },
          { name: "함안군" },
          { name: "창녕군" },
          { name: "고성군" },
          { name: "남해군" },
          { name: "하동군" },
          { name: "산청군" },
          { name: "함양군" },
          { name: "거창군" },
          { name: "합천군" }
        ]
      },
      {
        name: "제주특별자치도",
        cities: [{ name: "제주시" }, { name: "서귀포시" }]
      }
    ]
  },
  {
    country: "일본",
    regions: [
      {
        name: "도쿄도",
        cities: [
          { name: "치요다구" },
          { name: "주오구" },
          { name: "미나토구" },
          { name: "신주쿠구" },
          { name: "분쿄구" },
          { name: "다이토구" },
          { name: "스미다구" },
          { name: "고토구" },
          { name: "시나가와구" },
          { name: "메구로구" },
          { name: "오타구" },
          { name: "세타가와구" },
          { name: "시부야구" },
          { name: "나카노구" },
          { name: "스기나미구" },
          { name: "도시마구" },
          { name: "기타구" },
          { name: "아라카와구" },
          { name: "이타바시구" },
          { name: "네리마구" },
          { name: "아다치구" },
          { name: "가쓰시카구" },
          { name: "에도가와구" },
          { name: "하치오지시" },
          { name: "다치카와시" },
          { name: "무사시노시" },
          { name: "미타카시" },
          { name: "마치다시" }
        ]
      },
      {
        name: "오사카부",
        cities: [
          { name: "오사카시" },
          { name: "사카이시" },
          { name: "기시와다시" },
          { name: "도요나카시" },
          { name: "이케다시" },
          { name: "스이타시" },
          { name: "다카쓰키시" },
          { name: "히라카타시" },
          { name: "이바라키시" },
          { name: "야오시" },
          { name: "히가시오사카시" }
        ]
      },
      {
        name: "가나가와현",
        cities: [
          { name: "요코하마시" },
          { name: "가와사키시" },
          { name: "사가미하라시" },
          { name: "요코스카시" },
          { name: "후지사와시" },
          { name: "가마쿠라시" },
          { name: "아쓰기시" }
        ]
      },
      {
        name: "아이치현",
        cities: [
          { name: "나고야시" },
          { name: "도요타시" },
          { name: "오카자키시" },
          { name: "이치노미야시" },
          { name: "도요하시시" }
        ]
      },
      {
        name: "교토부",
        cities: [{ name: "교토시" }, { name: "우지시" }, { name: "가메오카시" }]
      },
      {
        name: "후쿠오카현",
        cities: [
          { name: "후쿠오카시" },
          { name: "기타큐슈시" },
          { name: "구루메시" },
          { name: "이즈카시" }
        ]
      },
      {
        name: "홋카이도",
        cities: [
          { name: "삿포로시" },
          { name: "아사히카와시" },
          { name: "하코다테시" },
          { name: "오타루시" },
          { name: "오비히로시" }
        ]
      },
      {
        name: "효고현",
        cities: [
          { name: "고베시" },
          { name: "히메지시" },
          { name: "니시노미야시" },
          { name: "아마가사키시" }
        ]
      },
      {
        name: "사이타마현",
        cities: [
          { name: "사이타마시" },
          { name: "가와구치시" },
          { name: "가와고에시" },
          { name: "도코로자와시" }
        ]
      },
      {
        name: "치바현",
        cities: [
          { name: "치바시" },
          { name: "후나바시시" },
          { name: "마쓰도시" },
          { name: "가시와시" },
          { name: "이치카와시" }
        ]
      },
      {
        name: "미야기현",
        cities: [{ name: "센다이시" }, { name: "이시노마키시" }]
      },
      {
        name: "이바라키현",
        cities: [{ name: "미토시" }, { name: "쓰쿠바시" }]
      },
      {
        name: "도치기현",
        cities: [{ name: "우쓰노미야시" }]
      },
      {
        name: "군마현",
        cities: [{ name: "마에바시시" }, { name: "다카사키시" }]
      },
      {
        name: "니가타현",
        cities: [{ name: "니가타시" }, { name: "나가오카시" }]
      },
      {
        name: "시즈오카현",
        cities: [{ name: "시즈오카시" }, { name: "하마마쓰시" }]
      },
      {
        name: "나가노현",
        cities: [{ name: "나가노시" }, { name: "마쓰모토시" }]
      },
      {
        name: "기후현",
        cities: [{ name: "기후시" }]
      },
      {
        name: "미에현",
        cities: [{ name: "쓰시" }, { name: "욧카이치시" }]
      },
      {
        name: "시가현",
        cities: [{ name: "오쓰시" }, { name: "구사쓰시" }]
      },
      {
        name: "나라현",
        cities: [{ name: "나라시" }]
      },
      {
        name: "히로시마현",
        cities: [{ name: "히로시마시" }, { name: "후쿠야마시" }]
      },
      {
        name: "오카야마현",
        cities: [{ name: "오카야마시" }, { name: "구라시키시" }]
      },
      {
        name: "구마모토현",
        cities: [{ name: "구마모토시" }]
      },
      {
        name: "가고시마현",
        cities: [{ name: "가고시마시" }]
      },
      {
        name: "오키나와현",
        cities: [{ name: "나하시" }, { name: "오키나와시" }]
      },
      {
        name: "이시카와현",
        cities: [{ name: "가나자와시" }]
      },
      {
        name: "도야마현",
        cities: [{ name: "도야마시" }]
      },
      {
        name: "후쿠이현",
        cities: [{ name: "후쿠이시" }]
      },
      {
        name: "야마나시현",
        cities: [{ name: "고후시" }]
      },
      {
        name: "와카야마현",
        cities: [{ name: "와카야마시" }]
      },
      {
        name: "가가와현",
        cities: [{ name: "다카마쓰시" }]
      },
      {
        name: "에히메현",
        cities: [{ name: "마쓰야마시" }]
      },
      {
        name: "나가사키현",
        cities: [{ name: "나가사키시" }]
      }
    ]
  }
];

const emptyWorkLocation: WorkLocation = {
  country: "",
  region1: "",
  region2: "",
  region3: ""
};

const formatWorkLocation = (location: WorkLocation) => {
  return [location.country, location.region1, location.region2, location.region3]
    .filter(Boolean)
    .join(" > ");
};

const salaryFilterLabels: Record<string, string> = {
  disclosed: "급여 공개",
  undisclosed: "급여 미공개"
};

const deadlineFilterLabels: Record<string, string> = {
  dated: "마감일 있음",
  rolling: "상시 채용"
};

const matchesLocationSearch = (
  query: string,
  ...values: Array<string | undefined>
) => {
  if (!query) return true;
  return values.some((value) => value?.toLowerCase().includes(query));
};

const regionMatchesLocationSearch = (
  country: string,
  region: LocationTree["regions"][number],
  query: string
) => {
  return (
    matchesLocationSearch(query, country, region.name) ||
    region.cities.some((city) =>
      matchesLocationSearch(query, city.name, ...(city.districts ?? []))
    )
  );
};

const jobsData: JobListing[] = [
  {
    id: "job-1",
    icon: "DEV",
    isNew: true,
    title: "시니어 풀스택 엔지니어 (SaaS)",
    company: "TechFlow Inc.",
    source: "Saramin",
    category: "개발",
    country: "한국",
    language: "한국어",
    workLocation: {
      country: "한국",
      region1: "서울특별시",
      region2: "강남구"
    },
    location: "서울특별시 강남구 (하이브리드)",
    salary: "6,000 - 8,000만 원",
    experience: "시니어 (6년 이상)",
    jobType: "정규직",
    deadline: "2026-06-30",
    skills: ["React", "TypeScript", "Node.js", "AWS", "Docker"],
    description:
      "AI 기반 SaaS 플랫폼 확장을 위한 기술 리더를 찾습니다. 최신 클라우드 인프라 설계와 대규모 아키텍처 개선 경험이 풍부한 리더를 환영합니다. 주도적인 개발 문화를 지향하며 엔지니어링 수준을 한 단계 높여줄 파트너를 구합니다."
  },
  {
    id: "job-2",
    icon: "UX",
    isNew: false,
    title: "글로벌 프로덕트 디자이너 (UI/UX Mobile App Designer)",
    company: "Creative Logic",
    source: "JobKorea",
    category: "디자인",
    country: "일본",
    language: "일본어",
    workLocation: {
      country: "일본",
      region1: "도쿄도",
      region2: "세타가와구"
    },
    location: "도쿄도 세타가와구",
    salary: "550 - 700만 엔",
    experience: "주니어 (3-5년)",
    jobType: "정규직",
    deadline: "2026-07-15",
    skills: ["Figma", "Sketch", "Prototyping", "Japanese"],
    description:
      "차세대 글로벌 협업 도구의 모바일 및 웹 UI/UX를 설계할 우수한 디자이너를 모십니다. 다국적 팀원들과의 적극적인 영어/일어 협업이 필요합니다. 아름답고 기능적인 컴포넌트를 설계하고, 완벽한 프로토타이핑을 구현하여 사용자 가치를 극대화합니다."
  },
  {
    id: "job-3",
    icon: "ML",
    isNew: true,
    title: "머신러닝 및 데이터 사이언티스트 (NLP/LLM)",
    company: "Insight Data Co.",
    source: "Wanted",
    category: "AI/데이터",
    country: "미국",
    language: "영어",
    workLocation: {
      country: "미국",
      region1: "캘리포니아주",
      region2: "샌프란시스코"
    },
    location: "캘리포니아주 샌프란시스코 (원격 근무 가능)",
    salary: "$120k - $150k",
    experience: "시니어 (6년 이상)",
    jobType: "정규직",
    deadline: "상시 채용",
    skills: ["Python", "PyTorch", "LLM", "Transformers", "SQL"],
    description:
      "수백만 사용자에게 개인화된 AI 커리어 피드백과 이력서 정밀 분석을 전달하는 차세대 추천 엔진을 구축합니다. 대형 언어 모델 파인튜닝 경험자를 우대합니다. 자연어 처리, 데이터 분석 파이프라인의 고도화를 지향합니다."
  },
  {
    id: "job-4",
    icon: "MKT",
    isNew: false,
    title: "성장 마케팅 전략가 (Growth Hacker)",
    company: "Growth Dynamics",
    source: "Mynavi",
    category: "마케팅",
    country: "일본",
    language: "일본어",
    workLocation: {
      country: "일본",
      region1: "오사카부",
      region2: "오사카시"
    },
    location: "오사카부 오사카시",
    salary: "450 - 600만 엔",
    experience: "주니어 (3-5년)",
    jobType: "계약직",
    deadline: "2026-06-15",
    skills: ["Google Analytics", "SQL", "SEO", "Growth Hacking"],
    description:
      "신흥 핀테크 스타트업 시장을 선점하기 위한 데이터 기반의 초고속 성장 마케팅 루프를 정의하고 실행합니다. A/B 테스트 및 유저 퍼널 분석 전문가를 환영합니다. 다양한 광고 플랫폼 유입 성과를 추적하고 캠페인을 최적화합니다."
  },
  {
    id: "job-5",
    icon: "SEC",
    isNew: false,
    title: "보안 운영 및 침해 대응 분석가 (SecOps Analyst)",
    company: "CyberGuard Global",
    source: "Green",
    category: "보안",
    country: "한국",
    language: "한국어",
    workLocation: {
      country: "한국",
      region1: "서울특별시",
      region2: "마포구"
    },
    location: "서울특별시 마포구",
    salary: "5,000 - 7,000만 원",
    experience: "주니어 (3-5년)",
    jobType: "정규직",
    deadline: "2026-08-31",
    skills: ["Firewall", "IDS/IPS", "Vulnerability Check", "Python"],
    description:
      "엔터프라이즈 글로벌 파트너의 중요한 디지털 인프라를 실시간 위협으로부터 안전하게 모니터링하고 차단하며 보안 위협의 인시던트 신속 대응 업무를 전담합니다. 취약점 모니터링 및 주기적인 침투 분석을 설계합니다."
  },
  {
    id: "job-6",
    icon: "PM",
    isNew: false,
    title: "Technical Project Manager (AI/Data Platform)",
    company: "ScaleUp Systems",
    source: "Saramin",
    category: "PM",
    country: "미국",
    language: "영어",
    workLocation: {
      country: "미국",
      region1: "워싱턴주",
      region2: "시애틀"
    },
    location: "워싱턴주 시애틀",
    experience: "시니어 (6년 이상)",
    jobType: "정규직",
    deadline: "2026-06-30",
    skills: ["Agile", "Scrum", "Jira", "Software Architecture"],
    description:
      "복잡한 비즈니스 엔지니어링 파이프라인과 인프라 요구사항 간의 가교 역할을 효율적으로 수행하며, 분산 애자일 스크럼 팀을 이끌어갈 소프트웨어 배경의 전문가를 구합니다. 비즈니스 이정표 수립 및 우선순위 정렬을 수행합니다."
  },
  {
    id: "job-7",
    icon: "DEV",
    isNew: true,
    title: "프론트엔드 개발자 (React/Next.js)",
    company: "PixelPerfect Inc.",
    source: "Wanted",
    category: "개발",
    country: "한국",
    language: "한국어",
    workLocation: {
      country: "한국",
      region1: "경기도",
      region2: "성남시",
      region3: "분당구"
    },
    location: "경기도 성남시 분당구",
    salary: "4,000 - 6,000만 원",
    experience: "신입 (0-2년)",
    jobType: "정규직",
    deadline: "2026-07-31",
    skills: ["React", "Next.js", "TypeScript", "Vanilla CSS"],
    description:
      "인터랙티브 웹 서비스를 구현하고 웹 성능 최적화를 진행할 신입 개발자를 모집합니다. 수준 높은 UX와 정교한 애니메이션 구현에 관심 있는 분을 찾습니다. 디자이너 및 기획자와의 긴밀한 커뮤니케이션 능력이 필요합니다."
  }
];

export function Jobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedWorkLocation, setSelectedWorkLocation] =
    useState<WorkLocation>(emptyWorkLocation);
  const [selectedExperience, setSelectedExperience] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("");
  const [isLocationPopoverOpen, setIsLocationPopoverOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedSalaryFilter, setSelectedSalaryFilter] = useState("");
  const [selectedDeadlineFilter, setSelectedDeadlineFilter] = useState("");
  const [isNewOnly, setIsNewOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const selectedCountryNode = useMemo(() => {
    return locationTree.find((country) => country.country === selectedWorkLocation.country);
  }, [selectedWorkLocation.country]);

  const selectedRegionNode = useMemo(() => {
    return selectedCountryNode?.regions.find(
      (region) => region.name === selectedWorkLocation.region1
    );
  }, [selectedCountryNode, selectedWorkLocation.region1]);

  const normalizedLocationSearch = locationSearch.trim().toLowerCase();

  const visibleCountries = useMemo(() => {
    if (!normalizedLocationSearch) return locationTree;

    return locationTree.filter((country) =>
      country.regions.some((region) =>
        regionMatchesLocationSearch(country.country, region, normalizedLocationSearch)
      )
    );
  }, [normalizedLocationSearch]);

  const visibleRegionOptions = useMemo(() => {
    const baseCountries = selectedCountryNode ? [selectedCountryNode] : visibleCountries;

    return baseCountries.flatMap((country) =>
      country.regions
        .filter((region) =>
          regionMatchesLocationSearch(country.country, region, normalizedLocationSearch)
        )
        .map((region) => ({
          country: country.country,
          region
        }))
    );
  }, [normalizedLocationSearch, selectedCountryNode, visibleCountries]);

  const visibleCityOptions = useMemo(() => {
    if (!selectedRegionNode) return [];

    return selectedRegionNode.cities.filter((city) =>
      matchesLocationSearch(
        normalizedLocationSearch,
        selectedWorkLocation.country,
        selectedWorkLocation.region1,
        city.name,
        ...(city.districts ?? [])
      )
    );
  }, [
    normalizedLocationSearch,
    selectedRegionNode,
    selectedWorkLocation.country,
    selectedWorkLocation.region1
  ]);

  const skillOptions = useMemo(() => {
    return Array.from(new Set(jobsData.flatMap((job) => job.skills))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, []);

  const hasAdvancedFilters =
    isNewOnly ||
    selectedSkill !== "" ||
    selectedSalaryFilter !== "" ||
    selectedDeadlineFilter !== "";

  const filteredJobs = useMemo(() => {
    return jobsData.filter((job) => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesText =
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.category.toLowerCase().includes(query) ||
          formatWorkLocation(job.workLocation).toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.skills.some((skill) => skill.toLowerCase().includes(query));

        if (!matchesText) {
          return false;
        }
      }

      if (selectedCategory && job.category !== selectedCategory) return false;
      if (
        selectedWorkLocation.country &&
        job.workLocation.country !== selectedWorkLocation.country
      ) {
        return false;
      }
      if (
        selectedWorkLocation.region1 &&
        job.workLocation.region1 !== selectedWorkLocation.region1
      ) {
        return false;
      }
      if (
        selectedWorkLocation.region2 &&
        job.workLocation.region2 !== selectedWorkLocation.region2
      ) {
        return false;
      }
      if (
        selectedWorkLocation.region3 &&
        job.workLocation.region3 !== selectedWorkLocation.region3
      ) {
        return false;
      }
      if (selectedExperience && job.experience !== selectedExperience) return false;
      if (selectedJobType && job.jobType !== selectedJobType) return false;
      if (isNewOnly && !job.isNew) return false;
      if (selectedSkill && !job.skills.includes(selectedSkill)) return false;
      if (selectedSalaryFilter === "disclosed" && !job.salary) return false;
      if (selectedSalaryFilter === "undisclosed" && job.salary) return false;
      if (selectedDeadlineFilter === "dated" && job.deadline === "상시 채용") return false;
      if (selectedDeadlineFilter === "rolling" && job.deadline !== "상시 채용") return false;

      return true;
    });
  }, [
    searchQuery,
    selectedCategory,
    selectedWorkLocation,
    selectedExperience,
    selectedJobType,
    isNewOnly,
    selectedSkill,
    selectedSalaryFilter,
    selectedDeadlineFilter
  ]);

  useEffect(() => {
    setIsLoading(true);
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    searchQuery,
    selectedCategory,
    selectedWorkLocation,
    selectedExperience,
    selectedJobType,
    isNewOnly,
    selectedSkill,
    selectedSalaryFilter,
    selectedDeadlineFilter
  ]);

  useEffect(() => {
    if (!isLocationPopoverOpen && !isAdvancedFilterOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;

      const isLocationSurface = Boolean(
        event.target.closest(".jobsLocationPopover, .jobsFilterButton")
      );
      const isAdvancedSurface = Boolean(
        event.target.closest(".jobsAdvancedPopover, .jobsAdvancedFilterBtn")
      );

      if (isLocationPopoverOpen && !isLocationSurface) {
        setIsLocationPopoverOpen(false);
      }

      if (isAdvancedFilterOpen && !isAdvancedSurface) {
        setIsAdvancedFilterOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isLocationPopoverOpen, isAdvancedFilterOpen]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = [];
    if (searchQuery) {
      list.push({
        key: "query",
        value: `검색어: "${searchQuery}"`,
        onClear: () => setSearchQuery("")
      });
    }
    if (selectedCategory) {
      list.push({
        key: "category",
        value: `직무: ${selectedCategory}`,
        onClear: () => setSelectedCategory("")
      });
    }
    if (selectedWorkLocation.country) {
      list.push({
        key: "workLocation",
        value: `근무 지역: ${formatWorkLocation(selectedWorkLocation)}`,
        onClear: () => setSelectedWorkLocation(emptyWorkLocation)
      });
    }
    if (selectedExperience) {
      list.push({
        key: "experience",
        value: `경력: ${selectedExperience}`,
        onClear: () => setSelectedExperience("")
      });
    }
    if (selectedJobType) {
      list.push({
        key: "jobType",
        value: `고용형태: ${selectedJobType}`,
        onClear: () => setSelectedJobType("")
      });
    }
    if (isNewOnly) {
      list.push({
        key: "newOnly",
        value: "New 공고",
        onClear: () => setIsNewOnly(false)
      });
    }
    if (selectedSkill) {
      list.push({
        key: "skill",
        value: `기술: ${selectedSkill}`,
        onClear: () => setSelectedSkill("")
      });
    }
    if (selectedSalaryFilter) {
      list.push({
        key: "salary",
        value: salaryFilterLabels[selectedSalaryFilter],
        onClear: () => setSelectedSalaryFilter("")
      });
    }
    if (selectedDeadlineFilter) {
      list.push({
        key: "deadline",
        value: deadlineFilterLabels[selectedDeadlineFilter],
        onClear: () => setSelectedDeadlineFilter("")
      });
    }

    return list;
  }, [
    searchQuery,
    selectedCategory,
    selectedWorkLocation,
    selectedExperience,
    selectedJobType,
    isNewOnly,
    selectedSkill,
    selectedSalaryFilter,
    selectedDeadlineFilter
  ]);

  const selectedJob = useMemo(() => {
    return jobsData.find((job) => job.id === selectedJobId) ?? null;
  }, [selectedJobId]);

  const handleOpenDetail = (id: string) => {
    setSelectedJobId(id);
    setIsDetailLoading(true);
    window.setTimeout(() => {
      setIsDetailLoading(false);
    }, 300);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedWorkLocation(emptyWorkLocation);
    setSelectedExperience("");
    setSelectedJobType("");
    handleResetAdvancedFilters();
    setLocationSearch("");
    setIsError(false);
  };

  const handleResetAdvancedFilters = () => {
    setIsNewOnly(false);
    setSelectedSkill("");
    setSelectedSalaryFilter("");
    setSelectedDeadlineFilter("");
  };

  const handleSelectCountry = (country: string) => {
    setSelectedWorkLocation({ country, region1: "", region2: "", region3: "" });
  };

  const handleSelectRegion = (region1: string, country = selectedWorkLocation.country) => {
    setSelectedWorkLocation({
      country,
      region1,
      region2: "",
      region3: ""
    });
  };

  const handleSelectCity = (region2: string) => {
    setSelectedWorkLocation((current) => ({
      country: current.country,
      region1: current.region1,
      region2,
      region3: ""
    }));
  };

  return (
    <main className="jobsPage">
      <HomeTopNav active="jobs" />

      <section className="jobsContent">
        <div className="jobsStateSimulators">
          <span className="simLabel">기능 상태 리뷰</span>
          <button
            type="button"
            className={`simBtn ${isLoading ? "active" : ""}`}
            onClick={() => setIsLoading((current) => !current)}
          >
            로딩 {isLoading ? "OFF" : "ON"}
          </button>
          <button
            type="button"
            className={`simBtn ${isError ? "active" : ""}`}
            onClick={() => setIsError((current) => !current)}
          >
            에러 {isError ? "OFF" : "ON"}
          </button>
        </div>

        <div className="jobsFilterArea">
          <div className="jobsFilterBar" aria-label="채용공고 검색과 필터">
            <label className="jobsSearchField">
              <span>검색어</span>
              <input
                placeholder="직무, 회사명, 스킬 또는 키워드 입력"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <div className="jobsFilterControls">
              <FilterSelect
                label="직무"
                value={selectedCategory}
                onChange={setSelectedCategory}
              >
                <option value="">직무</option>
                <option value="개발">개발</option>
                <option value="AI/데이터">AI/데이터</option>
                <option value="디자인">디자인</option>
                <option value="마케팅">마케팅</option>
                <option value="보안">보안</option>
                <option value="PM">PM</option>
              </FilterSelect>
              <FilterSelect
                label="경력 수준"
                value={selectedExperience}
                onChange={setSelectedExperience}
              >
                <option value="">경력</option>
                <option value="신입 (0-2년)">신입 (0-2년)</option>
                <option value="주니어 (3-5년)">주니어 (3-5년)</option>
                <option value="시니어 (6년 이상)">시니어 (6년 이상)</option>
              </FilterSelect>
              <button
                aria-expanded={isLocationPopoverOpen}
                className={`jobsFilterControl jobsFilterButton ${
                  selectedWorkLocation.country ? "selected" : ""
                }`}
                type="button"
                onClick={() => {
                  setIsAdvancedFilterOpen(false);
                  setIsLocationPopoverOpen((current) => !current);
                }}
              >
                <span>근무 지역</span>
                <FilterChevronIcon />
              </button>
              <FilterSelect
                label="고용형태"
                value={selectedJobType}
                onChange={setSelectedJobType}
              >
                <option value="">고용형태</option>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
              </FilterSelect>
              <button
                aria-expanded={isAdvancedFilterOpen}
                className={`jobsFilterControl jobsAdvancedFilterBtn ${
                  hasAdvancedFilters ? "selected" : ""
                }`}
                type="button"
                onClick={() => {
                  setIsLocationPopoverOpen(false);
                  setIsAdvancedFilterOpen((current) => !current);
                }}
              >
                <span>상세 필터</span>
                <FilterChevronIcon />
              </button>
              {activeFilters.length > 0 ? (
                <button
                  type="button"
                  className="jobsFilterResetBtn"
                  onClick={handleResetFilters}
                >
                  필터 초기화
                </button>
              ) : null}
            </div>
          </div>

          {isLocationPopoverOpen ? (
            <div className="jobsLocationPopover" role="dialog" aria-label="근무 지역 선택">
              <label className="jobsLocationSearch">
                <span>지역명 입력</span>
                <input
                  placeholder="지역명 입력"
                  type="search"
                  value={locationSearch}
                  onChange={(event) => setLocationSearch(event.target.value)}
                />
              </label>
              <div className="jobsLocationSelected">
                선택: {formatWorkLocation(selectedWorkLocation) || "근무 지역"}
              </div>
              <div className="jobsLocationColumns">
                <section className="jobsLocationColumn">
                  <h3>국가</h3>
                  {visibleCountries.length > 0 ? (
                    visibleCountries.map((country) => (
                      <button
                        className={
                          selectedWorkLocation.country === country.country ? "active" : ""
                        }
                        key={country.country}
                        type="button"
                        onClick={() => handleSelectCountry(country.country)}
                      >
                        {country.country}
                      </button>
                    ))
                  ) : (
                    <p>검색 결과 없음</p>
                  )}
                </section>

                <section className="jobsLocationColumn">
                  <h3>광역 지역</h3>
                  {visibleRegionOptions.length > 0 ? (
                    visibleRegionOptions.map(({ country, region }) => (
                      <button
                        className={
                          selectedWorkLocation.country === country &&
                          selectedWorkLocation.region1 === region.name
                            ? "active"
                            : ""
                        }
                        key={`${country}-${region.name}`}
                        type="button"
                        onClick={() => handleSelectRegion(region.name, country)}
                      >
                        {selectedCountryNode ? region.name : `${region.name} · ${country}`}
                      </button>
                    ))
                  ) : (
                    <p>검색 결과 없음</p>
                  )}
                </section>

                <section className="jobsLocationColumn">
                  <h3>시/구</h3>
                  {selectedRegionNode ? (
                    visibleCityOptions.length > 0 ? (
                      visibleCityOptions.map((city) => (
                        <button
                          className={
                            selectedWorkLocation.region2 === city.name ? "active" : ""
                          }
                          key={city.name}
                          type="button"
                          onClick={() => handleSelectCity(city.name)}
                        >
                          {city.name}
                        </button>
                      ))
                    ) : (
                      <p>검색 결과 없음</p>
                    )
                  ) : (
                    <p>광역 지역을 선택하세요</p>
                  )}
                </section>
              </div>
              <div className="jobsLocationActions">
                <button
                  className="jobsLocationClearBtn"
                  type="button"
                  onClick={() => setSelectedWorkLocation(emptyWorkLocation)}
                >
                  선택 해제
                </button>
                <button
                  className="jobsLocationApplyBtn"
                  type="button"
                  onClick={() => setIsLocationPopoverOpen(false)}
                >
                  적용
                </button>
              </div>
            </div>
          ) : null}

          {isAdvancedFilterOpen ? (
            <div className="jobsAdvancedPopover" role="dialog" aria-label="상세 필터">
              <div className="jobsAdvancedHeader">
                <h2>상세 필터</h2>
                <button
                  aria-label="상세 필터 닫기"
                  type="button"
                  onClick={() => setIsAdvancedFilterOpen(false)}
                >
                  ×
                </button>
              </div>

              <section className="jobsAdvancedSection">
                <h3>공고 상태</h3>
                <label className="jobsAdvancedToggle">
                  <input
                    checked={isNewOnly}
                    type="checkbox"
                    onChange={(event) => setIsNewOnly(event.target.checked)}
                  />
                  <span>New 공고만</span>
                </label>
              </section>

              <section className="jobsAdvancedSection">
                <h3>기술 스택</h3>
                <div className="jobsAdvancedChips">
                  {skillOptions.map((skill) => (
                    <button
                      className={selectedSkill === skill ? "active" : ""}
                      key={skill}
                      type="button"
                      onClick={() =>
                        setSelectedSkill((current) => (current === skill ? "" : skill))
                      }
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </section>

              <section className="jobsAdvancedSection">
                <h3>급여</h3>
                <div className="jobsAdvancedSegmented">
                  <button
                    className={selectedSalaryFilter === "disclosed" ? "active" : ""}
                    type="button"
                    onClick={() =>
                      setSelectedSalaryFilter((current) =>
                        current === "disclosed" ? "" : "disclosed"
                      )
                    }
                  >
                    공개
                  </button>
                  <button
                    className={selectedSalaryFilter === "undisclosed" ? "active" : ""}
                    type="button"
                    onClick={() =>
                      setSelectedSalaryFilter((current) =>
                        current === "undisclosed" ? "" : "undisclosed"
                      )
                    }
                  >
                    미공개
                  </button>
                </div>
              </section>

              <section className="jobsAdvancedSection">
                <h3>마감</h3>
                <div className="jobsAdvancedSegmented">
                  <button
                    className={selectedDeadlineFilter === "dated" ? "active" : ""}
                    type="button"
                    onClick={() =>
                      setSelectedDeadlineFilter((current) =>
                        current === "dated" ? "" : "dated"
                      )
                    }
                  >
                    마감일 있음
                  </button>
                  <button
                    className={selectedDeadlineFilter === "rolling" ? "active" : ""}
                    type="button"
                    onClick={() =>
                      setSelectedDeadlineFilter((current) =>
                        current === "rolling" ? "" : "rolling"
                      )
                    }
                  >
                    상시 채용
                  </button>
                </div>
              </section>

              <div className="jobsAdvancedActions">
                <button type="button" onClick={handleResetAdvancedFilters}>
                  조건 지우기
                </button>
                <button type="button" onClick={() => setIsAdvancedFilterOpen(false)}>
                  적용
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {activeFilters.length > 0 ? (
          <div className="jobsActiveFilterChips" aria-label="적용 중인 필터">
            {activeFilters.map((filter) => (
              <span className="jobsFilterChip" key={filter.key}>
                {filter.value}
                <button
                  aria-label={`${filter.value} 필터 지우기`}
                  type="button"
                  onClick={filter.onClear}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <header className="jobsHeading">
          <h1>
            총 <span>{filteredJobs.length}</span>개의 공고가 당신을 기다리고 있습니다
          </h1>
          {activeFilters.length > 0 ? (
            <p className="jobsFilterSummary">
              적용된 조건:{" "}
              <strong>{activeFilters.map((filter) => filter.value).join(", ")}</strong>
            </p>
          ) : null}
        </header>

        {isError ? (
          <div className="jobsErrorState" role="alert">
            <span className="material-symbols-outlined errorIcon">warning</span>
            <h3>서버와의 연결이 원활하지 않습니다</h3>
            <p>데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
            <button className="errorRetryBtn" type="button" onClick={() => setIsError(false)}>
              다시 시도하기
            </button>
          </div>
        ) : isLoading ? (
          <section className="jobsGrid skeletonGrid" aria-label="채용공고를 불러오는 중">
            {[1, 2, 3].map((item) => (
              <article className="jobsCard skeletonCard" key={`skeleton-${item}`}>
                <div className="jobsCardTop">
                  <div className="skeletonIcon pulse" />
                  <div className="skeletonBadge pulse" />
                </div>
                <div className="jobsCardBody">
                  <div className="skeletonTitle pulse" />
                  <div className="skeletonMeta pulse" />
                  <div className="skeletonConditions pulse" />
                  <div className="skeletonSkills pulse">
                    <span className="pulse" />
                    <span className="pulse" />
                    <span className="pulse" />
                  </div>
                  <div className="skeletonDesc pulse" />
                </div>
                <div className="jobsCardActions">
                  <div className="skeletonLink pulse" />
                  <div className="skeletonBtn pulse" />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <>
            <section className="jobsGrid" aria-label="채용공고 목록">
              {filteredJobs.map((job) => (
                <article className="jobsCard" key={job.id}>
                  <div className="jobsCardTop">
                    <div className="jobsCardIcon">{job.icon}</div>
                    <div className="jobsCardBadges">
                      {job.isNew ? <span className="jobsNewBadge">New</span> : null}
                      <span className="jobsSourceBadge">{job.source}</span>
                    </div>
                  </div>
                  <div className="jobsCardBody">
                    <h2 className="jobsCardTitle">{job.title}</h2>
                    <div className="jobsCardMeta">
                      <span className="jobsCardCompany">{job.company}</span>
                      <span className="jobsCardDivider">|</span>
                      <span className="jobsCardLoc">{job.location}</span>
                    </div>
                    <div className="jobsConditions">
                      <span className="jobsConditionItem">
                        <strong>경력:</strong> {job.experience}
                      </span>
                      <span className="jobsConditionItem">
                        <strong>고용:</strong> {job.jobType}
                      </span>
                      {job.salary ? (
                        <span className="jobsConditionItem">
                          <strong>급여:</strong> {job.salary}
                        </span>
                      ) : null}
                      <span className="jobsConditionItem">
                        <strong>마감:</strong> {job.deadline}
                      </span>
                    </div>
                    <div className="jobsCardSkills">
                      {job.skills.map((skill) => (
                        <span className="jobsSkillTag" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    <p className="jobsDescription">{job.description}</p>
                  </div>
                  <div className="jobsCardActions">
                    <button
                      className="jobsDetailLinkBtn"
                      type="button"
                      onClick={() => handleOpenDetail(job.id)}
                    >
                      상세 보기
                    </button>
                    <a className="jobsAnalyzeBtn" href={`/ai-analysis?jobId=${job.id}`}>
                      AI 적합도 분석
                    </a>
                  </div>
                </article>
              ))}
            </section>

            {filteredJobs.length === 0 ? (
              <div className="jobsEmptyState">
                <span className="material-symbols-outlined">search_off</span>
                <h3>일치하는 채용공고가 없습니다</h3>
                <p>검색어를 변경하거나 필터를 초기화해 보세요.</p>
                <button type="button" onClick={handleResetFilters}>
                  필터 초기화하기
                </button>
              </div>
            ) : null}
          </>
        )}

        <nav className="jobsPagination" aria-label="채용공고 페이지">
          <button aria-label="이전 페이지" disabled type="button">
            ‹
          </button>
          <button className="active" type="button">
            1
          </button>
          <button disabled type="button">
            2
          </button>
          <button disabled type="button">
            3
          </button>
          <span>...</span>
          <button disabled type="button">
            12
          </button>
          <button aria-label="다음 페이지" disabled type="button">
            ›
          </button>
        </nav>
      </section>

      {selectedJobId ? (
        <>
          <div
            aria-hidden="true"
            className="jobsDrawerBackdrop"
            onClick={() => setSelectedJobId(null)}
          />
          <aside
            aria-labelledby="drawer-title"
            className="jobsDetailDrawer open"
            role="dialog"
          >
            <div className="drawerHeader">
              <button
                aria-label="상세 보기 닫기"
                className="drawerCloseBtn"
                type="button"
                onClick={() => setSelectedJobId(null)}
              >
                ×
              </button>
              <div className="drawerBadges">
                {selectedJob?.isNew ? <span className="jobsNewBadge">New</span> : null}
                {selectedJob ? (
                  <span className="jobsSourceBadge">{selectedJob.source}</span>
                ) : null}
              </div>
            </div>

            {isDetailLoading ? (
              <div className="drawerLoadingState">
                <div className="spinner" />
                <p>공고 정보를 불러오는 중입니다...</p>
              </div>
            ) : selectedJob ? (
              <div className="drawerContent">
                <header className="drawerContentHeader">
                  <h2 id="drawer-title">{selectedJob.title}</h2>
                  <div className="drawerMeta">
                    <span className="drawerCompany">{selectedJob.company}</span>
                    <span className="drawerLoc">{selectedJob.location}</span>
                    <span className="drawerGeo">
                      {selectedJob.country} · {selectedJob.language}
                    </span>
                  </div>
                </header>

                <section className="drawerSection">
                  <h3>주요 계약 조건</h3>
                  <table className="drawerConditionsTable">
                    <tbody>
                      <tr>
                        <th>필요 경력</th>
                        <td>{selectedJob.experience}</td>
                      </tr>
                      <tr>
                        <th>고용 형태</th>
                        <td>{selectedJob.jobType}</td>
                      </tr>
                      {selectedJob.salary ? (
                        <tr>
                          <th>제시 급여</th>
                          <td>{selectedJob.salary}</td>
                        </tr>
                      ) : null}
                      <tr>
                        <th>지원 마감</th>
                        <td>{selectedJob.deadline}</td>
                      </tr>
                      <tr>
                        <th>수집 출처</th>
                        <td>{selectedJob.source} 플랫폼 연동</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <section className="drawerSection">
                  <h3>보유/요구 기술 스킬</h3>
                  <div className="drawerSkills">
                    {selectedJob.skills.map((skill) => (
                      <span className="drawerSkillTag" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="drawerSection">
                  <h3>상세 직무 설명</h3>
                  <div className="drawerDesc">
                    <p>{selectedJob.description}</p>
                    <p className="placeholderParagraph">
                      본 공고는 AI 매칭 엔진의 다국어 정밀 분석 시스템으로 구동되고
                      있습니다. Neet2Work에서 자기소개서를 준비하여 AI 적합도 분석을
                      실행하면, 현재 공고 요건과 자소서 간의 어휘, 기술 스택, 핵심
                      역량을 정밀하게 판별한 리포트를 받아볼 수 있습니다.
                    </p>
                  </div>
                </section>

                <div className="drawerActions">
                  <a
                    className="drawerOriginalLink"
                    href="https://wanted.co.kr"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    원문 공고 열기
                    <svg
                      aria-hidden="true"
                      className="externalIcon"
                      viewBox="0 0 24 24"
                    >
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                  <a className="drawerAnalyzeBtn" href={`/ai-analysis?jobId=${selectedJob.id}`}>
                    이 공고로 AI 분석하기
                  </a>
                </div>
              </div>
            ) : (
              <div className="drawerErrorState">
                <p>공고 정보를 찾을 수 없습니다.</p>
              </div>
            )}
          </aside>
        </>
      ) : null}

      <HomeFooter />
    </main>
  );
}
