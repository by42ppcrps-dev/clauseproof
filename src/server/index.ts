interface StaticAssetBinding {
  fetch(request: Request): Promise<Response>;
}

interface Environment {
  ASSETS: StaticAssetBinding;
}

function resolveAssetRequest(request: Request): Request {
  if (request.method !== "GET" && request.method !== "HEAD") return request;

  const url = new URL(request.url);
  if (url.pathname !== "/") return request;

  url.pathname = "/index.html";
  return new Request(url, request);
}

export default {
  fetch(request: Request, environment: Environment): Promise<Response> {
    return environment.ASSETS.fetch(resolveAssetRequest(request));
  },
};
