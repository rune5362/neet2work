import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Code2, ListChecks, Megaphone, Palette, ShieldCheck } from "lucide-react";
import {
  type DeadlineTypeFilterValue,
  type EmploymentTypeFilterValue,
  type SalaryVisibilityFilterValue,
  getJobById,
  getJobs
} from "../api/client";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { CareerStage, EmploymentTypeCategory, JobPosting } from "../types/job";

type JobListing = {
  id: string;
  icon?: string;
  isNew: boolean;
  title: string;
  company: string;
  source: string;
  sourceUrl: string;
  sourceValue?: string;
  category: string;
  country: string;
  countryValue?: string;
  language: string;
  languageValue?: string;
  workLocation: WorkLocation;
  location: string;
  salary?: string;
  educationLevel?: string;
  applyMethod?: string;
  experience: string;
  careerStage?: CareerStage | null;
  jobType: string;
  jobTypeCategory?: EmploymentTypeCategory | null;
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
  countryValue?: string;
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

type FilterOption = {
  value: string;
  label: string;
};

type PaginationItem = number | "ellipsis";

type JobsUrlState = {
  q: string;
  jobCategory: string;
  countryCode: string;
  region1: string;
  region2: string;
  region3: string;
  careerStage: CareerStage | "";
  employmentTypeCategory: EmploymentTypeFilterValue | "";
  skill: string;
  salaryVisibility: SalaryVisibilityFilterValue | "";
  deadlineType: DeadlineTypeFilterValue | "";
  newOnly: boolean;
  page: number;
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

function JobsAlertIcon() {
  return (
    <svg
      aria-hidden="true"
      className="jobsStateIcon jobsStateIconError"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 8v5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
      <path
        d="M10.29 3.86 2.82 17a2 2 0 0 0 1.74 3h14.88a2 2 0 0 0 1.74-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function JobsEmptyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="jobsStateIcon jobsStateIconEmpty"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="5.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m15 15 4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m8.75 8.75 3.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m12.25 8.75-3.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function JobCategoryIcon({ category }: { category: string }) {
  if (category === "AI/데이터") {
    return <Bot aria-hidden="true" className="jobsCardIconSvg" />;
  }

  if (category === "디자인") {
    return <Palette aria-hidden="true" className="jobsCardIconSvg" />;
  }

  if (category === "마케팅") {
    return <Megaphone aria-hidden="true" className="jobsCardIconSvg" />;
  }

  if (category === "보안") {
    return <ShieldCheck aria-hidden="true" className="jobsCardIconSvg" />;
  }

  if (category === "PM") {
    return <ListChecks aria-hidden="true" className="jobsCardIconSvg" />;
  }

  return <Code2 aria-hidden="true" className="jobsCardIconSvg" />;
}

function jobCategoryIconClass(category: string) {
  if (category === "AI/데이터") return "is-ai";
  if (category === "디자인") return "is-design";
  if (category === "마케팅") return "is-marketing";
  if (category === "보안") return "is-security";
  if (category === "PM") return "is-pm";
  return "is-development";
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

const careerStageOptions: Array<FilterOption & { value: CareerStage }> = [
  { value: "entry", label: "신입 (0-2년)" },
  { value: "junior", label: "주니어 (3-5년)" },
  { value: "senior", label: "시니어 (6년 이상)" }
];

const careerStageLabels = Object.fromEntries(
  careerStageOptions.map((option) => [option.value, option.label])
) as Record<CareerStage, string>;

const employmentTypeOptions: Array<FilterOption & { value: EmploymentTypeFilterValue }> = [
  { value: "permanent", label: "정규직" },
  { value: "contract", label: "계약직" },
  { value: "intern", label: "인턴" },
  { value: "freelance", label: "프리랜서" },
  { value: "unspecified", label: "미기재" }
];

const employmentTypeLabels = Object.fromEntries(
  employmentTypeOptions.map((option) => [option.value, option.label])
) as Record<EmploymentTypeFilterValue, string>;

const careerStageOptionValues = new Set<CareerStage>(careerStageOptions.map((option) => option.value));
const employmentTypeOptionValues = new Set<EmploymentTypeFilterValue>(
  employmentTypeOptions.map((option) => option.value)
);
const salaryVisibilityOptionValues = new Set<SalaryVisibilityFilterValue>(["disclosed", "undisclosed"]);
const deadlineTypeOptionValues = new Set<DeadlineTypeFilterValue>(["dated", "rolling"]);

const countryLabels: Record<string, string> = {
  KR: "한국",
  JP: "일본",
  US: "미국"
};

const japaneseLocationEntries = [
  ["北海道", "홋카이도"],
  ["青森県", "아오모리현"],
  ["岩手県", "이와테현"],
  ["宮城県", "미야기현"],
  ["秋田県", "아키타현"],
  ["山形県", "야마가타현"],
  ["福島県", "후쿠시마현"],
  ["茨城県", "이바라키현"],
  ["栃木県", "도치기현"],
  ["群馬県", "군마현"],
  ["埼玉県", "사이타마현"],
  ["千葉県", "치바현"],
  ["東京都", "도쿄도"],
  ["神奈川県", "가나가와현"],
  ["富山県", "도야마현"],
  ["石川県", "이시카와현"],
  ["福井県", "후쿠이현"],
  ["新潟県", "니가타현"],
  ["山梨県", "야마나시현"],
  ["長野県", "나가노현"],
  ["岐阜県", "기후현"],
  ["静岡県", "시즈오카현"],
  ["愛知県", "아이치현"],
  ["三重県", "미에현"],
  ["滋賀県", "시가현"],
  ["京都府", "교토부"],
  ["大阪府", "오사카부"],
  ["兵庫県", "효고현"],
  ["奈良県", "나라현"],
  ["和歌山県", "와카야마현"],
  ["鳥取県", "돗토리현"],
  ["島根県", "시마네현"],
  ["岡山県", "오카야마현"],
  ["広島県", "히로시마현"],
  ["山口県", "야마구치현"],
  ["徳島県", "도쿠시마현"],
  ["香川県", "가가와현"],
  ["愛媛県", "에히메현"],
  ["高知県", "고치현"],
  ["福岡県", "후쿠오카현"],
  ["佐賀県", "사가현"],
  ["長崎県", "나가사키현"],
  ["熊本県", "구마모토현"],
  ["大分県", "오이타현"],
  ["宮崎県", "미야자키현"],
  ["鹿児島県", "가고시마현"],
  ["沖縄県", "오키나와현"],
  ["Minato", "미나토구"],
  ["Chiyoda", "치요다구"],
  ["Shibuya", "시부야구"],
  ["Taito", "다이토구"],
  ["Tokyo", "도쿄도"],
  ["Tochigi", "도치기현"],
  ["Ibaraki", "이바라키현"],
  ["Philippines", "필리핀"],
  ["海外", "해외"]
] as const;

const languageLabels: Record<string, string> = {
  ko: "한국어",
  ja: "일본어",
  en: "영어"
};

function countryCodeFromLabel(label?: string) {
  if (!label) return "";

  return Object.entries(countryLabels).find(([, display]) => display === label)?.[0] ?? label;
}

function displayCountry(value?: string | null) {
  if (!value) return "국가 미기재";
  return countryLabels[value] ?? value;
}

function displayLanguage(value?: string | null) {
  if (!value) return "언어 미기재";
  return languageLabels[value] ?? value;
}

function normalizeCareerStage(stage?: string | null): CareerStage | null {
  if (stage === "entry" || stage === "junior" || stage === "senior") {
    return stage;
  }

  return null;
}

function normalizeQueryParam(value: string | null) {
  return value?.trim() ?? "";
}

function parsePositivePageParam(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function readJobsUrlState(): JobsUrlState {
  if (typeof window === "undefined") {
    return {
      q: "",
      jobCategory: "",
      countryCode: "",
      region1: "",
      region2: "",
      region3: "",
      careerStage: "",
      employmentTypeCategory: "",
      skill: "",
      salaryVisibility: "",
      deadlineType: "",
      newOnly: false,
      page: 1
    };
  }

  const params = new URLSearchParams(window.location.search);
  const countryCode = normalizeQueryParam(params.get("country"));
  const careerStage = normalizeQueryParam(params.get("careerStage"));
  const employmentTypeCategory = normalizeQueryParam(params.get("employmentTypeCategory"));
  const salaryVisibility = normalizeQueryParam(params.get("salaryVisibility"));
  const deadlineType = normalizeQueryParam(params.get("deadlineType"));

  return {
    q: normalizeQueryParam(params.get("q")),
    jobCategory: normalizeQueryParam(params.get("jobCategory")),
    countryCode: countryCode && countryCode in countryLabels ? countryCode : "",
    region1: normalizeQueryParam(params.get("region1")),
    region2: normalizeQueryParam(params.get("region2")),
    region3: normalizeQueryParam(params.get("region3")),
    careerStage: careerStageOptionValues.has(careerStage as CareerStage)
      ? (careerStage as CareerStage)
      : "",
    employmentTypeCategory: employmentTypeOptionValues.has(
      employmentTypeCategory as EmploymentTypeFilterValue
    )
      ? (employmentTypeCategory as EmploymentTypeFilterValue)
      : "",
    skill: normalizeQueryParam(params.get("skill")),
    salaryVisibility: salaryVisibilityOptionValues.has(
      salaryVisibility as SalaryVisibilityFilterValue
    )
      ? (salaryVisibility as SalaryVisibilityFilterValue)
      : "",
    deadlineType: deadlineTypeOptionValues.has(deadlineType as DeadlineTypeFilterValue)
      ? (deadlineType as DeadlineTypeFilterValue)
      : "",
    newOnly: params.get("newOnly") === "1",
    page: parsePositivePageParam(params.get("page"))
  };
}

function buildJobsUrlSearch(state: JobsUrlState) {
  const params = new URLSearchParams();

  if (state.q) params.set("q", state.q);
  if (state.jobCategory) params.set("jobCategory", state.jobCategory);
  if (state.countryCode) params.set("country", state.countryCode);
  if (state.region1) params.set("region1", state.region1);
  if (state.region2) params.set("region2", state.region2);
  if (state.region3) params.set("region3", state.region3);
  if (state.careerStage) params.set("careerStage", state.careerStage);
  if (state.employmentTypeCategory) {
    params.set("employmentTypeCategory", state.employmentTypeCategory);
  }
  if (state.skill) params.set("skill", state.skill);
  if (state.salaryVisibility) params.set("salaryVisibility", state.salaryVisibility);
  if (state.deadlineType) params.set("deadlineType", state.deadlineType);
  if (state.newOnly) params.set("newOnly", "1");
  if (state.page > 1) params.set("page", String(state.page));

  return params.toString();
}

function classifyCareerStageFromCareerLevel(careerLevel: string): CareerStage | null {
  const raw = careerLevel.trim();
  if (!raw) return null;

  if (/experience not specified|경력 확인 필요|経験条件一部ログイン後|즉시 지원|홈페이지 지원/i.test(raw)) {
    return null;
  }

  const yearMatches = [...raw.matchAll(/(\d+)\s*(?:년|年|years?|yrs?)/gi)].map((match) =>
    Number(match[1])
  );
  const maxYear = yearMatches.length > 0 ? Math.max(...yearMatches) : undefined;

  if (maxYear !== undefined) {
    if (maxYear >= 6) return "senior";
    if (maxYear >= 3) return "junior";
    return "entry";
  }

  if (/(senior|lead|시니어)/i.test(raw)) return "senior";
  if (/(mid career|experience welcome|junior|주니어)/i.test(raw)) return "junior";
  if (/(未経験|entry level|신입|인턴|intern|新卒)/i.test(raw)) return "entry";

  return null;
}

function normalizeEmploymentTypeCategory(category?: string | null): EmploymentTypeCategory | null {
  if (
    category === "permanent" ||
    category === "contract" ||
    category === "intern" ||
    category === "freelance"
  ) {
    return category;
  }

  return null;
}

function classifyEmploymentTypeCategoryFromEmploymentSignals(
  employmentType?: string | null,
  title?: string,
  careerLevel?: string,
  description?: string
): EmploymentTypeCategory | null {
  const rawEmploymentType = employmentType?.trim() ?? "";
  const explicitEmploymentTypeCategory = classifyEmploymentTypeSignalText(rawEmploymentType);
  if (explicitEmploymentTypeCategory) {
    return explicitEmploymentTypeCategory;
  }

  const fallbackSignalText = [title, careerLevel, description]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  return classifyEmploymentTypeSignalText(fallbackSignalText);
}

function classifyEmploymentTypeSignalText(signalText: string): EmploymentTypeCategory | null {
  if (!signalText) return null;
  if (/(freelance|フリーランス|業務委託|프리랜서)/i.test(signalText)) return "freelance";
  if (/(\binternship\b|\bintern\b|インターン|인턴십|체험형 인턴|채용연계형 인턴|인턴)/i.test(signalText)) {
    return "intern";
  }
  if (/(契約社員|\bcontract employee\b|\bcontract-based\b|\bcontractual\b|\bfixed-term\b|계약직)/i.test(signalText)) {
    return "contract";
  }
  if (/(正社員|\bfull-time employee\b|\bfull time\b|\bfull-time\b|\bpermanent\b|정규직)/i.test(signalText)) {
    return "permanent";
  }

  return null;
}

function formatCareerDisplayValue(careerStage?: CareerStage | null): string {
  if (careerStage === "entry") return "신입 (0-2년)";
  if (careerStage === "junior") return "주니어 (3-5년)";
  if (careerStage === "senior") return "시니어 (6년 이상)";
  return "경력 미기재";
}

function formatEmploymentDisplayValue(
  employmentTypeCategory?: EmploymentTypeCategory | null
): string {
  if (employmentTypeCategory === "permanent") return "정규직";
  if (employmentTypeCategory === "contract") return "계약직";
  if (employmentTypeCategory === "intern") return "인턴";
  if (employmentTypeCategory === "freelance") return "프리랜서";
  return "고용 미기재";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMappedLocationLabels(
  text: string,
  entries: ReadonlyArray<readonly [string, string]>
): string[] {
  const matches = entries.flatMap(([needle, label]) => {
    const isAsciiToken = /^[A-Za-z]+$/.test(needle);
    const pattern = isAsciiToken
      ? new RegExp(`\\b${escapeRegExp(needle)}\\b`, "gi")
      : new RegExp(escapeRegExp(needle), "g");

    return Array.from(text.matchAll(pattern)).map((match) => ({
      index: match.index ?? Number.MAX_SAFE_INTEGER,
      label
    }));
  });

  const seen = new Set<string>();
  return matches
    .sort((left, right) => left.index - right.index)
    .map((match) => match.label)
    .filter((label) => {
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });
}

function formatKoreanCardLocation(rawLocation: string, hasRemoteSignal: boolean): string {
  const normalized = rawLocation.replace(/\s+/g, " ").trim();
  if (!normalized || normalized === "지역 확인 필요") {
    return hasRemoteSignal ? "지역 확인 필요 · 풀리모트 가능" : "지역 확인 필요";
  }

  const multipleMatch = normalized.match(/(.+?)\s*외\s*(\d+)/);
  if (multipleMatch) {
    const base = `${multipleMatch[1].trim()} 외 ${multipleMatch[2]}곳`;
    return hasRemoteSignal ? `${base} · 풀리모트 가능` : base;
  }

  if (!/(서울|경기|부산|대구|인천|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)/.test(normalized)) {
    return hasRemoteSignal ? "지역 확인 필요 · 풀리모트 가능" : "지역 확인 필요";
  }

  return hasRemoteSignal ? `${normalized} · 풀리모트 가능` : normalized;
}

function formatJapaneseCardLocation(rawLocation: string, hasRemoteSignal: boolean): string {
  const normalized = rawLocation.replace(/\s+/g, " ").trim();
  if (!normalized || /勤務地確認必要/.test(normalized)) {
    return hasRemoteSignal ? "지역 확인 필요 · 풀리모트 가능" : "지역 확인 필요";
  }

  if (/Available across Japan/i.test(normalized)) {
    return hasRemoteSignal ? "일본 전국 · 풀리모트 가능" : "일본 전국";
  }

  if (/Tokyo\s*-\s*23\s*Wards/i.test(normalized)) {
    return hasRemoteSignal ? "도쿄 23구 · 풀리모트 가능" : "도쿄 23구";
  }

  if (/フルリモート/i.test(normalized) && !/[都道府県市区郡]|Tokyo|Minato|Chiyoda|Shibuya|Taito/i.test(normalized)) {
    return "풀리모트 가능";
  }

  const labels = extractMappedLocationLabels(normalized, japaneseLocationEntries);
  if (labels.length >= 5) {
    return hasRemoteSignal ? "일본 전국 · 풀리모트 가능" : "일본 전국";
  }
  if (
    labels.length === 2 &&
    /(?:도|현|부)$/.test(labels[0]) &&
    /(?:구|시)$/.test(labels[1])
  ) {
    const base = `${labels[0]} ${labels[1]}`;
    return hasRemoteSignal ? `${base} · 풀리모트 가능` : base;
  }
  if (labels.length >= 2) {
    const base = `${labels[0]} 외 ${labels.length - 1}곳`;
    return hasRemoteSignal ? `${base} · 풀리모트 가능` : base;
  }
  if (labels.length === 1) {
    return hasRemoteSignal ? `${labels[0]} · 풀리모트 가능` : labels[0];
  }

  return hasRemoteSignal ? "일본 전국 · 풀리모트 가능" : normalized;
}

function formatCardLocation(job: JobListing): string {
  const normalizedLocation = job.location.replace(/\s+/g, " ").trim();
  if (!normalizedLocation) {
    return "지역 확인 필요";
  }

  const hasRemoteSignal = [job.location, job.title, job.description].some((value) =>
    /(フルリモ|풀리모트|full remote|remote|원격)/i.test(value)
  );

  if (job.countryValue === "JP") {
    return formatJapaneseCardLocation(normalizedLocation, hasRemoteSignal);
  }

  if (job.countryValue === "KR") {
    return formatKoreanCardLocation(normalizedLocation, hasRemoteSignal);
  }

  return normalizedLocation;
}

function formatMillionYenValue(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return `${value}만 엔`;
  }

  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1
  }).format(amount * 100)}만 엔`;
}

function formatTenThousandValue(value: number, unit: "엔" | "원"): string {
  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1
  }).format(value)}만 ${unit}`;
}

function parseNumericValue(value: string): number {
  return Number(value.replace(/,/g, "").trim());
}

function formatSalaryDisplayValue(salary?: string): string {
  const normalized = salary?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "급여 미기재";
  }

  const negotiableCapMatch = normalized.match(
    /(negotiable|depends on experience|based on experience).*?(\d+(?:\.\d+)?)\s*million\s*yen/i
  );
  if (negotiableCapMatch) {
    return `최대 ${formatMillionYenValue(negotiableCapMatch[2])} (협의)`;
  }

  const jpyKRangeMatch = normalized.match(
    /JPY\s*(\d+(?:\.\d+)?)K\s*[~-]\s*JPY\s*(\d+(?:\.\d+)?)K/i
  );
  if (jpyKRangeMatch) {
    return `${formatTenThousandValue(parseNumericValue(jpyKRangeMatch[1]) / 10, "엔")} ~ ${formatTenThousandValue(parseNumericValue(jpyKRangeMatch[2]) / 10, "엔")}`;
  }

  const jpyKOverMatch = normalized.match(/JPY\s*(\d+(?:\.\d+)?)K\s*(?:Over|Above|Up|以上)/i);
  if (jpyKOverMatch) {
    return `${formatTenThousandValue(parseNumericValue(jpyKOverMatch[1]) / 10, "엔")} 이상`;
  }

  const millionYenRangeMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*million\s*yen\s*[~-]\s*(\d+(?:\.\d+)?)\s*million\s*yen/i
  );
  if (millionYenRangeMatch) {
    return `${formatMillionYenValue(millionYenRangeMatch[1])} ~ ${formatMillionYenValue(millionYenRangeMatch[2])}`;
  }

  const japaneseManRangeMatch = normalized.match(
    /(\d[\d,]*)\s*万(?:円)?\s*[〜～~-]\s*(\d[\d,]*)\s*万(?:円)?/i
  );
  if (japaneseManRangeMatch) {
    return `${formatTenThousandValue(parseNumericValue(japaneseManRangeMatch[1]), "엔")} ~ ${formatTenThousandValue(parseNumericValue(japaneseManRangeMatch[2]), "엔")}`;
  }

  const koreanManRangeMatch = normalized.match(
    /(\d[\d,]*)\s*[~-]\s*(\d[\d,]*)\s*만원/i
  );
  if (koreanManRangeMatch) {
    return `${formatTenThousandValue(parseNumericValue(koreanManRangeMatch[1]), "원")} ~ ${formatTenThousandValue(parseNumericValue(koreanManRangeMatch[2]), "원")}`;
  }

  const koreanManOverMatch = normalized.match(/(\d[\d,]*)\s*만원\s*이상/i);
  if (koreanManOverMatch) {
    return `${formatTenThousandValue(parseNumericValue(koreanManOverMatch[1]), "원")} 이상`;
  }

  const rawManEnRangeMatch = normalized.match(
    /(\d[\d,]*)\s*[~-]\s*(\d[\d,]*)\s*만\s*엔/i
  );
  if (rawManEnRangeMatch) {
    return `${formatTenThousandValue(parseNumericValue(rawManEnRangeMatch[1]), "엔")} ~ ${formatTenThousandValue(parseNumericValue(rawManEnRangeMatch[2]), "엔")}`;
  }

  const singleMillionYenMatch = normalized.match(/(\d+(?:\.\d+)?)\s*million\s*yen/i);
  if (singleMillionYenMatch) {
    return formatMillionYenValue(singleMillionYenMatch[1]);
  }

  if (
    /회사\s*내규에\s*따름|면접\s*후\s*결정|negotiable|depends on experience|based on experience|応相談/i.test(
      normalized
    )
  ) {
    return "급여 협의";
  }

  return normalized;
}

function extractSalarySupplementaryNote(salary?: string): string | null {
  const normalized = salary?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const notes: string[] = [];

  if (/면접\s*후\s*결정/i.test(normalized)) {
    notes.push("면접 후 결정");
  }

  if (/회사\s*내규에\s*따름/i.test(normalized)) {
    notes.push("회사 내규 기준");
  }

  if (/negotiable|depends on experience|based on experience|応相談/i.test(normalized)) {
    notes.push("경력 및 협의에 따라 조정");
  }

  return notes.length > 0 ? notes.join(" / ") : null;
}

function formatDeadlineDisplayValue(deadline?: string): string {
  const normalized = deadline?.trim();
  if (!normalized || normalized === "마감일 미기재") {
    return "마감 미기재";
  }

  return normalized;
}

function sourceIcon(source?: string | null) {
  const normalized = source?.toLowerCase() ?? "";

  if (normalized.includes("green")) return "GR";
  if (normalized.includes("mynavi")) return "MY";
  if (normalized.includes("daijob")) return "DJ";
  if (normalized.includes("career")) return "CC";
  if (normalized.includes("saramin")) return "SA";
  if (normalized.includes("jobkorea")) return "JK";
  return "JOB";
}

function inferCategory(job: JobPosting) {
  const text = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();

  if (/(ai|data|ml|llm|machine|python|sql|데이터|머신러닝|인공지능)/.test(text)) {
    return "AI/데이터";
  }
  if (/(design|ui|ux|figma|디자인)/.test(text)) return "디자인";
  if (/(marketing|growth|seo|마케팅)/.test(text)) return "마케팅";
  if (/(security|secops|보안)/.test(text)) return "보안";
  if (/(project manager|product manager|pm|기획)/.test(text)) return "PM";
  return "개발";
}

function isNewlyPosted(postedAt?: string | null) {
  if (!postedAt) return false;

  const postedTime = new Date(postedAt).getTime();
  if (Number.isNaN(postedTime)) return false;

  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return Date.now() - postedTime <= threeDays;
}

function safeExternalJobUrl(value?: string | null): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function toJobListing(job: JobPosting): JobListing {
  const country = displayCountry(job.country);
  const employmentTypeCategory =
    normalizeEmploymentTypeCategory(job.employmentTypeCategory) ??
    classifyEmploymentTypeCategoryFromEmploymentSignals(
      job.employmentType,
      job.title,
      job.careerLevel,
      job.description
    );

  return {
    id: job.id,
    icon: sourceIcon(job.source),
    isNew: isNewlyPosted(job.postedAt),
    title: job.title,
    company: job.company,
    source: job.source ?? "unknown",
    sourceUrl: safeExternalJobUrl(job.sourceUrl) ?? "",
    sourceValue: job.source,
    category: job.jobCategory || inferCategory(job),
    country,
    countryValue: job.country,
    language: displayLanguage(job.language),
    languageValue: job.language,
    workLocation: {
      country
    },
    location: job.location,
    salary: job.salaryText ?? undefined,
    educationLevel: job.educationLevel ?? undefined,
    applyMethod: job.applyMethod ?? undefined,
    experience: job.careerLevel || "경력 무관",
    careerStage: normalizeCareerStage(job.careerStage) ?? classifyCareerStageFromCareerLevel(job.careerLevel),
    jobType: job.employmentType ?? "고용형태 미기재",
    jobTypeCategory: employmentTypeCategory,
    deadline: job.deadlineText ?? "마감일 미기재",
    skills: job.skills,
    description: job.description
  };
}

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

const fallbackJobsData: JobListing[] = [
  {
    id: "job-1",
    icon: "DEV",
    isNew: true,
    title: "시니어 풀스택 엔지니어 (SaaS)",
    company: "TechFlow Inc.",
    source: "Saramin",
    sourceUrl: "https://example.com/jobs/job-1",
    sourceValue: "saramin",
    category: "개발",
    country: "한국",
    countryValue: "KR",
    language: "한국어",
    languageValue: "ko",
    workLocation: {
      country: "한국",
      region1: "서울특별시",
      region2: "강남구"
    },
    location: "서울특별시 강남구 (하이브리드)",
    salary: "6,000 - 8,000만 원",
    experience: "시니어 (6년 이상)",
      careerStage: "senior",
      jobType: "정규직",
    jobTypeCategory: "permanent",
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
    sourceUrl: "https://example.com/jobs/job-2",
    sourceValue: "jobkorea",
    category: "디자인",
    country: "일본",
    countryValue: "JP",
    language: "일본어",
    languageValue: "ja",
    workLocation: {
      country: "일본",
      region1: "도쿄도",
      region2: "세타가와구"
    },
    location: "도쿄도 세타가와구",
    salary: "550 - 700만 엔",
    experience: "주니어 (3-5년)",
      careerStage: "junior",
      jobType: "정규직",
    jobTypeCategory: "permanent",
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
    sourceUrl: "https://example.com/jobs/job-3",
    sourceValue: "wanted",
    category: "AI/데이터",
    country: "미국",
    countryValue: "US",
    language: "영어",
    languageValue: "en",
    workLocation: {
      country: "미국",
      region1: "캘리포니아주",
      region2: "샌프란시스코"
    },
    location: "캘리포니아주 샌프란시스코 (원격 근무 가능)",
    salary: "$120k - $150k",
    experience: "시니어 (6년 이상)",
      careerStage: "senior",
      jobType: "정규직",
    jobTypeCategory: "permanent",
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
    sourceUrl: "https://example.com/jobs/job-4",
    sourceValue: "mynavi_tenshoku",
    category: "마케팅",
    country: "일본",
    countryValue: "JP",
    language: "일본어",
    languageValue: "ja",
    workLocation: {
      country: "일본",
      region1: "오사카부",
      region2: "오사카시"
    },
    location: "오사카부 오사카시",
    salary: "450 - 600만 엔",
    experience: "주니어 (3-5년)",
      careerStage: "junior",
      jobType: "계약직",
    jobTypeCategory: "contract",
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
    sourceUrl: "https://example.com/jobs/job-5",
    sourceValue: "green_japan",
    category: "보안",
    country: "한국",
    countryValue: "KR",
    language: "한국어",
    languageValue: "ko",
    workLocation: {
      country: "한국",
      region1: "서울특별시",
      region2: "마포구"
    },
    location: "서울특별시 마포구",
    salary: "5,000 - 7,000만 원",
    experience: "주니어 (3-5년)",
      careerStage: "junior",
      jobType: "정규직",
    jobTypeCategory: "permanent",
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
    sourceUrl: "https://example.com/jobs/job-6",
    sourceValue: "saramin",
    category: "PM",
    country: "미국",
    countryValue: "US",
    language: "영어",
    languageValue: "en",
    workLocation: {
      country: "미국",
      region1: "워싱턴주",
      region2: "시애틀"
    },
    location: "워싱턴주 시애틀",
    experience: "시니어 (6년 이상)",
      careerStage: "senior",
      jobType: "정규직",
    jobTypeCategory: "permanent",
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
    sourceUrl: "https://example.com/jobs/job-7",
    sourceValue: "wanted",
    category: "개발",
    country: "한국",
    countryValue: "KR",
    language: "한국어",
    languageValue: "ko",
    workLocation: {
      country: "한국",
      region1: "경기도",
      region2: "성남시",
      region3: "분당구"
    },
    location: "경기도 성남시 분당구",
    salary: "4,000 - 6,000만 원",
    experience: "신입 (0-2년)",
    careerStage: "entry",
    jobType: "정규직",
    jobTypeCategory: "permanent",
    deadline: "2026-07-31",
    skills: ["React", "Next.js", "TypeScript", "Vanilla CSS"],
    description:
      "인터랙티브 웹 서비스를 구현하고 웹 성능 최적화를 진행할 신입 개발자를 모집합니다. 수준 높은 UX와 정교한 애니메이션 구현에 관심 있는 분을 찾습니다. 디자이너 및 기획자와의 긴밀한 커뮤니케이션 능력이 필요합니다."
  }
];
const JOBS_PER_PAGE = 9;
const fallbackSkillOptions = Array.from(new Set(fallbackJobsData.flatMap((job) => job.skills))).sort(
  (a, b) => a.localeCompare(b)
);

function buildPaginationItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

export function Jobs() {
  const initialUrlStateRef = useRef<JobsUrlState | null>(null);
  const detailRequestIdRef = useRef(0);
  if (!initialUrlStateRef.current) {
    initialUrlStateRef.current = readJobsUrlState();
  }

  const initialUrlState = initialUrlStateRef.current;
  const [searchQuery, setSearchQuery] = useState(() => initialUrlState.q);
  const [selectedCategory, setSelectedCategory] = useState(() => initialUrlState.jobCategory);
  const [selectedWorkLocation, setSelectedWorkLocation] = useState<WorkLocation>(() => ({
    country: initialUrlState.countryCode ? displayCountry(initialUrlState.countryCode) : "",
    countryValue: initialUrlState.countryCode || undefined,
    region1: initialUrlState.region1,
    region2: initialUrlState.region2,
    region3: initialUrlState.region3
  }));
  const [selectedExperience, setSelectedExperience] = useState(() => initialUrlState.careerStage);
  const [selectedJobType, setSelectedJobType] = useState<EmploymentTypeFilterValue | "">(
    () => initialUrlState.employmentTypeCategory
  );
  const [isLocationPopoverOpen, setIsLocationPopoverOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState(() => initialUrlState.skill);
  const [selectedSalaryFilter, setSelectedSalaryFilter] = useState<
    SalaryVisibilityFilterValue | ""
  >(() => initialUrlState.salaryVisibility);
  const [selectedDeadlineFilter, setSelectedDeadlineFilter] = useState<
    DeadlineTypeFilterValue | ""
  >(() => initialUrlState.deadlineType);
  const [isNewOnly, setIsNewOnly] = useState(() => initialUrlState.newOnly);
  const [currentPage, setCurrentPage] = useState(() => initialUrlState.page);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [isUsingFallbackJobs, setIsUsingFallbackJobs] = useState(false);
  const [selectedJobDetail, setSelectedJobDetail] = useState<JobListing | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const hasMountedPaginationRef = useRef(false);
  const previousFilterKeyRef = useRef<string | null>(null);
  const selectedCountryCode = selectedWorkLocation.countryValue ?? "";
  const jobListFilterKey = useMemo(
    () =>
      JSON.stringify({
        query: searchQuery.trim(),
        jobCategory: selectedCategory,
        country: selectedCountryCode,
        region1: selectedWorkLocation.region1 ?? "",
        region2: selectedWorkLocation.region2 ?? "",
        region3: selectedWorkLocation.region3 ?? "",
        careerStage: selectedExperience,
        employmentTypeCategory: selectedJobType,
        newOnly: isNewOnly,
        skill: selectedSkill,
        salaryVisibility: selectedSalaryFilter,
        deadlineType: selectedDeadlineFilter
      }),
    [
      searchQuery,
      selectedCategory,
      selectedCountryCode,
      selectedWorkLocation.region1,
      selectedWorkLocation.region2,
      selectedWorkLocation.region3,
      selectedExperience,
      selectedJobType,
      isNewOnly,
      selectedSkill,
      selectedSalaryFilter,
      selectedDeadlineFilter
    ]
  );

  const jobsUrlSearch = useMemo(
    () =>
      buildJobsUrlSearch({
        q: searchQuery.trim(),
        jobCategory: selectedCategory,
        countryCode: selectedCountryCode,
        region1: selectedWorkLocation.region1 ?? "",
        region2: selectedWorkLocation.region2 ?? "",
        region3: selectedWorkLocation.region3 ?? "",
        careerStage: (selectedExperience as CareerStage | "") ?? "",
        employmentTypeCategory: selectedJobType,
        skill: selectedSkill,
        salaryVisibility: selectedSalaryFilter,
        deadlineType: selectedDeadlineFilter,
        newOnly: isNewOnly,
        page: currentPage
      }),
    [
      currentPage,
      isNewOnly,
      searchQuery,
      selectedCategory,
      selectedCountryCode,
      selectedDeadlineFilter,
      selectedExperience,
      selectedJobType,
      selectedSalaryFilter,
      selectedSkill,
      selectedWorkLocation.region1,
      selectedWorkLocation.region2,
      selectedWorkLocation.region3
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextUrl = `${window.location.pathname}${jobsUrlSearch ? `?${jobsUrlSearch}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [jobsUrlSearch]);

  useEffect(() => {
    const filtersChanged =
      previousFilterKeyRef.current !== null && previousFilterKeyRef.current !== jobListFilterKey;
    if (filtersChanged && currentPage !== 1) {
      previousFilterKeyRef.current = jobListFilterKey;
      setCurrentPage(1);
      return;
    }

    previousFilterKeyRef.current = jobListFilterKey;
    let isCurrent = true;

    setIsLoading(true);
    setIsError(false);
    setIsUsingFallbackJobs(false);

    getJobs({
      q: searchQuery.trim() || undefined,
      jobCategory: selectedCategory || undefined,
      country: selectedCountryCode || undefined,
      region1: selectedWorkLocation.region1 || undefined,
      region2: selectedWorkLocation.region2 || undefined,
      region3: selectedWorkLocation.region3 || undefined,
      careerStage: selectedExperience ? (selectedExperience as CareerStage) : undefined,
      employmentTypeCategory: selectedJobType || undefined,
      skill: selectedSkill || undefined,
      salaryVisibility: selectedSalaryFilter || undefined,
      deadlineType: selectedDeadlineFilter || undefined,
      newOnly: isNewOnly || undefined,
      page: currentPage,
      limit: JOBS_PER_PAGE
    })
      .then((response) => {
        if (!isCurrent) return;

        setJobs(response.data.map(toJobListing));
        setTotalJobs(response.total);
        setAvailableSkills(response.availableSkills);
        setIsUsingFallbackJobs(false);
        if (response.page !== currentPage) {
          setCurrentPage(response.page);
        }
      })
      .catch(() => {
        if (!isCurrent) return;

        setIsError(true);
        setJobs(fallbackJobsData.slice(0, JOBS_PER_PAGE));
        setTotalJobs(fallbackJobsData.length);
        setAvailableSkills(fallbackSkillOptions);
        setIsUsingFallbackJobs(true);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    currentPage,
    isNewOnly,
    jobListFilterKey,
    searchQuery,
    selectedCategory,
    selectedCountryCode,
    selectedDeadlineFilter,
    selectedExperience,
    selectedJobType,
    selectedSalaryFilter,
    selectedSkill,
    selectedWorkLocation.region1,
    selectedWorkLocation.region2,
    selectedWorkLocation.region3,
    retryVersion
  ]);

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

  const skillOptions = useMemo(() => availableSkills, [availableSkills]);

  const hasAdvancedFilters =
    isNewOnly ||
    selectedSkill !== "" ||
    selectedSalaryFilter !== "" ||
    selectedDeadlineFilter !== "";

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
        value: `경력: ${careerStageLabels[selectedExperience as CareerStage]}`,
        onClear: () => setSelectedExperience("")
      });
    }
    if (selectedJobType) {
      list.push({
        key: "jobType",
        value: `고용형태: ${employmentTypeLabels[selectedJobType as EmploymentTypeFilterValue]}`,
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
    return selectedJobDetail ?? jobs.find((job) => job.id === selectedJobId) ?? null;
  }, [jobs, selectedJobDetail, selectedJobId]);
  const selectedJobSourceUrl = useMemo(
    () => safeExternalJobUrl(selectedJob?.sourceUrl),
    [selectedJob?.sourceUrl]
  );

  const totalPages = Math.max(1, Math.ceil(totalJobs / JOBS_PER_PAGE));
  const visibleJobs = jobs;
  const paginationItems = useMemo(
    () => buildPaginationItems(totalPages, currentPage),
    [currentPage, totalPages]
  );

  useEffect(() => {
    if (!hasMountedPaginationRef.current) {
      hasMountedPaginationRef.current = true;
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, [currentPage]);

  const handleOpenDetail = async (id: string) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    const listJob = jobs.find((job) => job.id === id) ?? null;
    setSelectedJobId(id);
    setSelectedJobDetail(listJob);
    setIsDetailLoading(true);

    try {
      const detail = await getJobById(id);
      if (detailRequestIdRef.current !== requestId) return;
      setSelectedJobDetail(toJobListing(detail));
    } catch {
      if (detailRequestIdRef.current !== requestId) return;
      setSelectedJobDetail(listJob);
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setIsDetailLoading(false);
      }
    }
  };

  const handleCloseDetail = () => {
    detailRequestIdRef.current += 1;
    setSelectedJobId(null);
    setSelectedJobDetail(null);
    setIsDetailLoading(false);
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
    setIsUsingFallbackJobs(false);
  };

  const handleResetAdvancedFilters = () => {
    setIsNewOnly(false);
    setSelectedSkill("");
    setSelectedSalaryFilter("");
    setSelectedDeadlineFilter("");
  };

  const handleSelectCountry = (country: string) => {
    setSelectedWorkLocation({
      country,
      countryValue: countryCodeFromLabel(country),
      region1: "",
      region2: "",
      region3: ""
    });
  };

  const handleSelectRegion = (region1: string, country = selectedWorkLocation.country) => {
    setSelectedWorkLocation({
      country,
      countryValue: countryCodeFromLabel(country),
      region1,
      region2: "",
      region3: ""
    });
  };

  const handleSelectCity = (region2: string) => {
    setSelectedWorkLocation((current) => ({
      country: current.country,
      countryValue: current.countryValue,
      region1: current.region1,
      region2,
      region3: ""
    }));
  };

  return (
    <main className="jobsPage">
      <HomeTopNav active="jobs" />

      <section className="jobsContent">
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
                onChange={(value) => setSelectedExperience(value as CareerStage | "")}
              >
                <option value="">경력</option>
                {careerStageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
                onChange={(value) => setSelectedJobType(value as EmploymentTypeFilterValue | "")}
              >
                <option value="">고용형태</option>
                {employmentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
            총 <span>{totalJobs}</span>개의 공고가 당신을 기다리고 있습니다
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
            <JobsAlertIcon />
            <h3>서버와의 연결이 원활하지 않습니다</h3>
            <p>데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
            <button
              className="errorRetryBtn"
              type="button"
              onClick={() => setRetryVersion((version) => version + 1)}
            >
              다시 시도하기
            </button>
          </div>
        ) : null}

        {isUsingFallbackJobs ? (
          <div className="jobsFallbackNotice" role="status">
            <strong>샘플 데이터 표시 중</strong>
            <span>
              백엔드 응답을 가져오지 못해 데모용 공고를 대신 보여주고 있습니다.
            </span>
          </div>
        ) : null}

        {isLoading ? (
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
              {visibleJobs.map((job) => (
                <article className="jobsCard" key={job.id}>
                  <div className="jobsCardTop">
                    <div
                      aria-label={`${job.category} 직무`}
                      className={`jobsCardIcon ${jobCategoryIconClass(job.category)}`}
                      role="img"
                    >
                      <JobCategoryIcon category={job.category} />
                    </div>
                    <div className="jobsCardBadges">
                      {isUsingFallbackJobs ? (
                        <span className="jobsSampleBadge">Sample</span>
                      ) : null}
                      {job.isNew ? <span className="jobsNewBadge">New</span> : null}
                      <span className="jobsSourceBadge">{job.source}</span>
                    </div>
                  </div>
                  <div className="jobsCardBody">
                    <h2 className="jobsCardTitle">{job.title}</h2>
                    <div className="jobsCardMeta">
                      <span className="jobsCardCompany">{job.company}</span>
                      <span className="jobsCardDivider">|</span>
                      <span className="jobsCardLoc">{formatCardLocation(job)}</span>
                    </div>
                    <div className="jobsConditions">
                      <span className="jobsConditionItem">
                        <strong>경력:</strong>
                        <span className="jobsConditionValue">
                          {formatCareerDisplayValue(job.careerStage)}
                        </span>
                      </span>
                      <span className="jobsConditionItem">
                        <strong>고용:</strong>
                        <span className="jobsConditionValue">
                          {formatEmploymentDisplayValue(job.jobTypeCategory)}
                        </span>
                      </span>
                      <span className="jobsConditionItem">
                        <strong>급여:</strong>
                        <span className="jobsConditionValue">
                          {formatSalaryDisplayValue(job.salary)}
                        </span>
                      </span>
                      <span className="jobsConditionItem">
                        <strong>마감:</strong>
                        <span className="jobsConditionValue">
                          {formatDeadlineDisplayValue(job.deadline)}
                        </span>
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

            {totalJobs === 0 ? (
              <div className="jobsEmptyState">
                <JobsEmptyIcon />
                <h3>일치하는 채용공고가 없습니다</h3>
                <p>검색어를 변경하거나 필터를 초기화해 보세요.</p>
                <button type="button" onClick={handleResetFilters}>
                  필터 초기화하기
                </button>
              </div>
            ) : null}
          </>
        )}

        {totalJobs > 0 && totalPages > 1 ? (
          <nav className="jobsPagination" aria-label="채용공고 페이지">
            <button
              aria-label="이전 페이지"
              disabled={currentPage === 1}
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              ‹
            </button>
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`}>...</span>
              ) : (
                <button
                  aria-current={item === currentPage ? "page" : undefined}
                  className={item === currentPage ? "active" : ""}
                  key={item}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </button>
              )
            )}
            <button
              aria-label="다음 페이지"
              disabled={currentPage === totalPages}
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              ›
            </button>
          </nav>
        ) : null}
      </section>

      {selectedJobId ? (
        <>
          <div
            aria-hidden="true"
            className="jobsDrawerBackdrop"
            onClick={handleCloseDetail}
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
                onClick={handleCloseDetail}
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
                        <td>{formatCareerDisplayValue(selectedJob.careerStage)}</td>
                      </tr>
                      <tr>
                        <th>고용 형태</th>
                        <td>{formatEmploymentDisplayValue(selectedJob.jobTypeCategory)}</td>
                      </tr>
                      <tr>
                        <th>제시 급여</th>
                        <td>{formatSalaryDisplayValue(selectedJob.salary)}</td>
                      </tr>
                      {extractSalarySupplementaryNote(selectedJob.salary) ? (
                        <tr>
                          <th>급여 참고</th>
                          <td>{extractSalarySupplementaryNote(selectedJob.salary)}</td>
                        </tr>
                      ) : null}
                      {selectedJob.educationLevel ? (
                        <tr>
                          <th>학력</th>
                          <td>{selectedJob.educationLevel}</td>
                        </tr>
                      ) : null}
                      <tr>
                        <th>지원 마감</th>
                        <td>{formatDeadlineDisplayValue(selectedJob.deadline)}</td>
                      </tr>
                      {selectedJob.applyMethod ? (
                        <tr>
                          <th>지원 방식</th>
                          <td>{selectedJob.applyMethod}</td>
                        </tr>
                      ) : null}
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
                  {selectedJobSourceUrl ? (
                    <a
                      className="drawerOriginalLink"
                      href={selectedJobSourceUrl}
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
                  ) : null}
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
