declare module "jest-fetch-mock" {
  interface MockParams {
    status?: number;
    statusText?: string;
    url?: string;
    headers?: Object;
  }

  const fn: {
    (input?: string | Request, init?: RequestInit): Promise<Response>;
    mockResponse(body: string, init?: MockParams): void;
    mockResponseOnce(body: string, init?: MockParams): void;
    mockResponses(responses: Array<{body: string, init?: MockParams}>): void;
    resetMocks(): void;
    mockReject(error?: Error): void;
    mockRejectOnce(error?: Error): void;
    resetMocks(): void;
  }

  export = fn;
}
