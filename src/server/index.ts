interface StaticAssetBinding {
  fetch(request: Request): Promise<Response>;
}

interface Environment {
  ASSETS: StaticAssetBinding;
}

export default {
  fetch(request: Request, environment: Environment): Promise<Response> {
    return environment.ASSETS.fetch(request);
  },
};
