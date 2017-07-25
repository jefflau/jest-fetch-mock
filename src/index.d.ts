declare interface MockParams {
  status?: number;
  statusText?: string;
  url?: string;
  headers?: Object;
}

declare namespace fetch {
  function mockResponse(body: string, init?: MockParams): void;
  function mockResponseOnce(body: string, init?: MockParams): void;
  function mockResponses(responses: Array<{body: string, init?: MockParams}>): void;
  function resetMocks(): void;
  function mockReject(): void;
  function mockRejectOnce(): void;
  function resetMocks(): void;
}
