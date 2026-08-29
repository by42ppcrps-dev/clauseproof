import { describe, expect, it } from "vitest";

import server from "../../src/server/index.js";
import viteConfig from "../../vite.config.js";

function recordingAssets(requests: Request[]) {
  return {
    ASSETS: {
      fetch(request: Request): Promise<Response> {
        requests.push(request);
        return Promise.resolve(new Response("asset", { status: 200 }));
      },
    },
  };
}

describe("production static asset routing", () => {
  it("serves the built entry document for a root page request", async () => {
    const requests: Request[] = [];

    const response = await server.fetch(
      new Request("https://clauseproof.example/?judge=1"),
      recordingAssets(requests),
    );

    expect(response.status).toBe(200);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(
      "https://clauseproof.example/index.html?judge=1",
    );
  });

  it("passes static asset requests through unchanged", async () => {
    const requests: Request[] = [];
    const assetUrl = "https://clauseproof.example/assets/app.js";

    await server.fetch(new Request(assetUrl), recordingAssets(requests));

    expect(requests[0]?.url).toBe(assetUrl);
  });

  it("rewrites root HEAD requests without changing the method", async () => {
    const requests: Request[] = [];

    await server.fetch(
      new Request("https://clauseproof.example/", { method: "HEAD" }),
      recordingAssets(requests),
    );

    expect(requests[0]?.url).toBe("https://clauseproof.example/index.html");
    expect(requests[0]?.method).toBe("HEAD");
  });

  it("does not rewrite non-read requests", async () => {
    const requests: Request[] = [];

    await server.fetch(
      new Request("https://clauseproof.example/", { method: "POST" }),
      recordingAssets(requests),
    );

    expect(requests[0]?.url).toBe("https://clauseproof.example/");
    expect(requests[0]?.method).toBe("POST");
  });
});

describe("production build layout", () => {
  it("places browser assets in the Sites client directory", () => {
    expect(viteConfig.build?.outDir).toBe("dist/client");
  });
});
