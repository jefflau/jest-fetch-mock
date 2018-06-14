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
    mockResponse(body: string | Promise, init?: MockParams): Fetch;
    mockResponseOnce(body: string | Promise, init?: MockParams): Fetch;
    mockResponses(...responses : Array<[string] | [string, MockParams]>): Fetch;
    mockReject(error?: Error | Promise): Fetch;
    mockRejectOnce(error?: Error | Promise): Fetch;
    resetMocks(): void;
  }

  const fn: Fetch & jest.MockInstance<any>;
  export = fn;
}
