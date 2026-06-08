import { afterEach, describe, expect, it, vi } from "vitest";

const { lookupMock } = vi.hoisted(() => ({
  lookupMock: vi.fn()
}));

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock
}));

import { PortfolioAnalysisService } from "./portfolio-analysis.service.js";

function textResponse(html: string) {
  return Promise.resolve({
    ok: true,
    text: async () => html
  } as Response);
}

describe("PortfolioAnalysisService", () => {
  afterEach(() => {
    lookupMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("extracts public HTTPS portfolio pages", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      expect(init?.redirect).toBe("error");
      return textResponse(
        "<html><head><title>Portfolio</title></head><body>React TypeScript Node.js REST API</body></html>"
      );
    });
    const service = new PortfolioAnalysisService(fetchMock);

    const [analysis] = await service.analyzeFromText("https://portfolio.example.dev");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(analysis).toMatchObject({
      status: "fetched",
      title: "Portfolio",
      detectedSkills: expect.arrayContaining(["React", "TypeScript", "Node.js", "REST API"])
    });
  });

  it("does not fetch localhost, private, or link-local portfolio URLs", async () => {
    const fetchMock = vi.fn(() =>
      textResponse("<html><body>internal metadata should not be fetched</body></html>")
    );
    const service = new PortfolioAnalysisService(fetchMock);

    const analyses = await service.analyzeFromText(
      [
        "https://localhost/admin",
        "https://127.0.0.1:3000/health",
        "https://10.0.0.5/internal",
        "https://172.16.0.10/internal",
        "https://192.168.0.10/internal",
        "https://169.254.169.254/latest/meta-data"
      ].join(" ")
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(analyses).toHaveLength(3);
    expect(analyses.every((analysis) => analysis.status === "unavailable")).toBe(true);
  });

  it("does not fetch public hostnames that resolve to private addresses", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.10", family: 4 }]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const service = new PortfolioAnalysisService();

    const analysis = await service.analyzeUrl("https://portfolio.example.dev", "portfolio-1");

    expect(lookupMock).toHaveBeenCalledWith("portfolio.example.dev", { all: true, verbatim: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(analysis.status).toBe("unavailable");
  });
});
