# Chrome GPT Review Rules

Use this runbook only when a task uses `@chrome`, the Chrome plugin, ChatGPT,
GPT Pro, GPT review, or browser-based model selection.

## Chrome Plugin Preflight

- Do not decide Chrome is unavailable from the active MCP tool list alone.
- Check the bundled Chrome plugin/cache paths before falling back:
  - `C:\Users\pc07-00\.codex\plugins\cache\openai-bundled\chrome`
  - `C:\Users\pc07-00\.codex\.tmp\bundled-marketplaces\openai-bundled\plugins\chrome`
- Use the trusted bundled marketplace browser-client path:
  - `C:\Users\pc07-00\.codex\.tmp\bundled-marketplaces\openai-bundled\plugins\chrome\scripts\browser-client.mjs`
- Load the Chrome plugin skill before browser work:
  - `C:\Users\pc07-00\.codex\.tmp\bundled-marketplaces\openai-bundled\plugins\chrome\skills\chrome\SKILL.md`
- Connect through the Chrome extension backend, not the in-app browser:
  - `agent.browsers.get("extension")`
- Confirm the backend result before acting:
  - `selectedBrowser.name` is `Chrome`
  - `selectedBrowser.type` is `extension`

## ChatGPT Model Verification

- Do not infer the model from `헤비 모드`.
- Open the ChatGPT model menu and verify the model name.
- If using Pro, open the Pro settings/submenu as well.
- Confirm both:
  - model, for example `5.5 Pro`
  - Pro submode, either `표준` or `확장`
- For Pro extended mode, required UI evidence is:
  - model/menu shows `Pro`
  - Pro submenu shows `확장` checked
- Record the exact evidence in the plan or work log when model choice matters.

## GPT Review Rules

- Treat GPT output as external review, not as repo truth.
- After GPT review, reread the repo plan and reconcile the advice against
  actual files, scripts, constraints, and verification commands.
- Do not apply GPT suggestions that conflict with project guardrails:
  - no secrets
  - no login/captcha bypass
  - no browser automation for collection
  - no internal API reliance
  - no direct DB writes from Python collectors
  - no raw collection fields in public API responses
- Save the reconciled result in a repo-local plan or review note.

## Required Evidence To Record

- Chrome backend:
  - selected browser name
  - selected browser type
- ChatGPT model:
  - model label
  - Pro submode label when applicable
- Review result:
  - prompt source
  - output summary
  - repo reconciliation decision
