import logoUrl from "../assets/logo/neet2work_logo_lockup_reference_curve 1.png";

export function HomeTopNav() {
  return (
    <nav className="homeTopNav" aria-label="주요 메뉴">
      <div className="homeNavInner">
        <div className="homeNavLeft">
          <a href="/" aria-label="Neet2Work 홈">
            <img src={logoUrl} alt="Neet2Work Logo" />
          </a>
          <div className="homeNavLinks">
            <a className="active" href="#home">
              홈
            </a>
            <a href="#features">채용공고</a>
            <a href="#analysis">AI 분석</a>
            <a href="#support">커뮤니티</a>
          </div>
        </div>
        <div className="homeNavActions">
          <a className="homeIconButton" href="#support" aria-label="알림">
            <svg aria-hidden="true" height="24" viewBox="0 -960 960 960" width="24">
              <path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z" />
            </svg>
          </a>
          <a className="homeIconButton" href="#support" aria-label="계정">
            <svg aria-hidden="true" height="24" viewBox="0 -960 960 960" width="24">
              <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z" />
            </svg>
          </a>
          <a className="homeStartButton" href="#analysis">
            시작하기
          </a>
        </div>
      </div>
    </nav>
  );
}
