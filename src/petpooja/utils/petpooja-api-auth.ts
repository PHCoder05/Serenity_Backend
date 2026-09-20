export type PetpoojaApiCredentials = {
  appKey: string;
  appSecret: string;
  accessToken: string;
};

export function buildPetpoojaAuthBody(
  credentials: PetpoojaApiCredentials,
): Record<string, string> {
  return {
    app_key: credentials.appKey,
    app_secret: credentials.appSecret,
    access_token: credentials.accessToken,
  };
}

export function withPetpoojaAuthBody<T extends object>(
  credentials: PetpoojaApiCredentials,
  payload: T,
): T & Record<string, string> {
  return {
    ...buildPetpoojaAuthBody(credentials),
    ...payload,
  };
}
