declare module "jest-fetch-mock" {
  interface MockParams {
    status?: number;
    statusText?: string;
    url?: string;
    headers?: Object;
  }

  interface MockContext {
    calls: any[][];
    instances: any[];
  }

  interface Fetch {
    (input?: string | Request, init?: RequestInit): Promise<Response>;
    mockResponse(body: string, init?: MockParams): Fetch;
    mockResponseOnce(body: string, init?: MockParams): Fetch;
    mockResponses(responses: Array<{body: string, init?: MockParams}>): Fetch;
    mockReject(error?: Error): Fetch;
    mockRejectOnce(error?: Error): Fetch;
    resetMocks(): void;
    mock: MockContext;
  }

  const fn: Fetch;
  export = fn;
}
