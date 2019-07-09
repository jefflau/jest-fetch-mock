// TypeScript Version: 2.3
import Global = NodeJS.Global;
import "jest";

declare global {
    const fetchMock: FetchMock;
    namespace NodeJS {
        interface Global {
            fetch: FetchMock;
        }
    }
}

export interface GlobalWithFetchMock extends Global {
    fetchMock: FetchMock;
    fetch: FetchMock;
}

export interface FetchMock extends jest.MockInstance<any, any[]> {
    (input?: string | Request, init?: RequestInit): Promise<Response>;

    mockResponse(body: BodyOrFunction, init?: MockParams): FetchMock;
    mockResponseOnce(body: BodyOrFunction, init?: MockParams): FetchMock;
    once(body: BodyOrFunction, init?: MockParams): FetchMock;
    mockResponses(...responses: Array<BodyOrFunction | [BodyOrFunction, MockParams]>): FetchMock;
    mockReject(error?: ErrorOrFunction): FetchMock;
    mockRejectOnce(error?: ErrorOrFunction): FetchMock;

    isMocking(input: string | Request): boolean;
    neverMock(urlOrPredicate: UrlOrPredicate): FetchMock;
    neverMockOnce(urlOrPredicate: UrlOrPredicate): FetchMock;
    onlyMock(urlOrPredicate: UrlOrPredicate): FetchMock;
    onlyMockOnce(urlOrPredicate: UrlOrPredicate): FetchMock;

    resetMocks(): void;
    enableMocks(): void;
    disableMocks(): void;
}

// reference: https://github.github.io/fetch/#Response
export interface MockParams {
    status?: number;
    statusText?: string;
    headers?: string[][] | { [key: string]: string }; // HeadersInit
    url?: string;
}

export interface MockResponseInit extends MockParams {
    body?: string;
    init?: MockParams;
}

export type BodyOrFunction = string | MockResponseInitFunction;
export type ErrorOrFunction = Error | ((...args: any[]) => Promise<any>);
export type UrlOrPredicate = string | RegExp | ((input: string | Request, init?: RequestInit) => boolean);

export type MockResponseInitFunction = (
    input?: string | Request,
    init?: RequestInit
) => Promise<MockResponseInit | string>;
