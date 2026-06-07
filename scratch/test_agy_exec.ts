import { AgyCliProvider } from "../apps/backend/src/services/ai/agy-cli.provider.js";
import { aiConfig } from "../apps/backend/src/config/ai-config.js";

// 테스트를 위해 임시로 agyCli 활성화 및 workdir를 프로젝트 루트로 강제 고정
aiConfig.agyCli.enabled = true;
aiConfig.agyCli.workdir = "C:\\Users\\radmin\\Documents\\workspace\\2026_1\\neet2work";

// 윈도우 인자 길이 제한(8191자)을 넘지 않도록 극도로 단순화한 쇼트 페이로드
const shortPayload = {
  target: {
    company: "Test",
    role: "Dev",
    questionText: "Hi",
    charCountRule: "with_spaces",
    jobPostingText: "API",
    blindRecruitment: false
  },
  experienceInput: {
    profileContexts: [
      {
        profileId: "p-1",
        title: "P",
        schemaVersion: 1,
        profileJson: { skills: ["Node"] },
        desiredRoles: ["Dev"],
        skills: ["Node"]
      }
    ]
  }
};

async function test() {
  console.log("[TEST] AgyCliProvider.getStatus()...");
  const provider = new AgyCliProvider();
  const status = await provider.getStatus();
  console.log("[TEST] Status result:", JSON.stringify(status, null, 2));

  console.log("\n[TEST] AgyCliProvider.execute()...");
  try {
    const result = await provider.execute({
      operation: "plan",
      payload: shortPayload,
      timeoutMs: 120_000
    });
    console.log("[TEST] Execute Success:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("[TEST] Execute Failed:", error);
  }
}

test();
