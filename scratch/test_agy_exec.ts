import { AgyCliProvider } from "../apps/backend/src/services/ai/agy-cli.provider.js";
import { aiConfig } from "../apps/backend/src/config/ai-config.js";

// 테스트를 위해 임시로 agyCli 활성화, sandboxEnabled=true로 강제 고정
aiConfig.agyCli.enabled = true;
aiConfig.agyCli.sandboxEnabled = true;
aiConfig.agyCli.workdir = "C:\\Users\\radmin\\Documents\\workspace\\2026_1\\neet2work";

const validPayload = {
  target: {
    company: "Backend Bridge",
    role: "Backend Engineer",
    questionText: "지원 동기를 작성하세요.",
    charCountRule: "with_spaces",
    jobPostingText: "Node.js REST API",
    blindRecruitment: false
  },
  experienceInput: {
    profileContexts: [
      {
        profileId: "profile-1",
        title: "백엔드 프로필",
        schemaVersion: 1,
        profileJson: { skills: ["Node.js"] },
        desiredRoles: ["백엔드 엔지니어"],
        skills: ["Node.js"]
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
      payload: validPayload,
      timeoutMs: 120_000
    });
    console.log("[TEST] Execute Success:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("[TEST] Execute Failed:", error);
  }
}

test();
