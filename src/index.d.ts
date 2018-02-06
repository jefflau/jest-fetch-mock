declare module "jest-fetch-mock" {
  interface MockParams {
    status?: number;
    statusText?: string;
    url?: string;
    headers?: Object;
  }

  function mockResponse(body: string, init?: MockParams): void;
  function mockResponseOnce(body: string, init?: MockParams): void;
  function mockResponses(responses: Array<{body: string, init?: MockParams}>): void;
  function resetMocks(): void;
  function mockReject(): void;
  function mockRejectOnce(): void;
  function resetMocks(): void;
}
