declare module "jest-fetch-mock" {
  import "jest";

  interface MockParams {
    status?: number;
    statusText?: string;
    url?: string;
    headers?: Object;
  }

  interface Fetch {
    (input?: string | Request, init?: RequestInit): Promise<Response>;
    mockResponse(body: string, init?: MockParams): Fetch;
    mockResponseOnce(body: string, init?: MockParams): Fetch;
    once(body: string, init?: MockParams): Fetch;
    mockResponses(...responses : Array<[string] | [string, MockParams]>): Fetch;
    mockReject(error?: Error): Fetch;
    mockRejectOnce(error?: Error): Fetch;
    resetMocks(): void;
  }

  const fn: Fetch & jest.MockInstance<any>;
  export = fn;
}
