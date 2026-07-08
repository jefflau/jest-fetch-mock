// Self-contained definitions: no dependency on @types/jest's global namespace
// and no forced dom lib. Response/Request/Headers/RequestInit resolve from
// whichever ambient environment the consumer has (lib "dom" or @types/node 18+).

declare global {
    // eslint-disable-next-line no-var -- `var` is the correct TS idiom for globalThis properties
    var fetchMock: FetchMock;
}

/**
 * @deprecated Cast your global object to `typeof globalThis & { fetchMock: FetchMock }`
 * instead. Kept for backwards compatibility with older setup guides.
 */
export interface GlobalWithFetchMock {
    fetchMock: FetchMock;
    fetch: FetchMock;
    [key: string]: any;
}

export type FetchInput = string | URL | Request;
export type FetchImplementation = (input: FetchInput, init?: RequestInit) => Promise<Response>;
export type FetchMockCallArgs = [FetchInput?, (RequestInit | undefined)?];

export interface FetchMockResult {
    type: "return" | "throw" | "incomplete";
    value: unknown;
}

export interface FetchMockState {
    calls: FetchMockCallArgs[];
    results: FetchMockResult[];
    instances: unknown[];
    contexts: unknown[];
    lastCall?: FetchMockCallArgs;
    invocationCallOrder: number[];
}

/** The jest-mock surface of the fetch mock, declared structurally so no @types/jest is required. */
export interface FetchMockInstance {
    (input: FetchInput, init?: RequestInit): Promise<Response>;

    mock: FetchMockState;
    mockClear(): this;
    mockReset(): this;
    mockRestore(): void;
    getMockImplementation(): FetchImplementation | undefined;
    mockImplementation(fn: FetchImplementation): this;
    mockImplementationOnce(fn: FetchImplementation): this;
    mockName(name: string): this;
    getMockName(): string;
    mockReturnValue(value: Promise<Response>): this;
    mockReturnValueOnce(value: Promise<Response>): this;
    mockResolvedValue(value: Response): this;
    mockResolvedValueOnce(value: Response): this;
    mockRejectedValue(value: unknown): this;
    mockRejectedValueOnce(value: unknown): this;
}

export interface FetchMock extends FetchMockInstance {
    // Response mocking
    mockResponse(fn: MockResponseInitFunction): FetchMock;
    mockResponse(response: string, responseInit?: MockParams): FetchMock;
    mockResponse(response: Response): FetchMock;

    mockResponseOnce(fn: MockResponseInitFunction): FetchMock;
    mockResponseOnce(response: string, responseInit?: MockParams): FetchMock;
    mockResponseOnce(response: Response): FetchMock;

    // alias for mockResponseOnce
    once(fn: MockResponseInitFunction): FetchMock;
    once(url: string, responseInit?: MockParams): FetchMock;
    once(response: Response): FetchMock;

    mockResponses(...responses: Array<string | Response | [string, MockParams] | MockResponseInitFunction>): FetchMock;

    // Error/Reject mocking
    mockReject(error?: ErrorOrFunction): FetchMock;
    mockRejectOnce(error?: ErrorOrFunction): FetchMock;

    mockAbort(): FetchMock;
    mockAbortOnce(): FetchMock;

    // Conditional Mocking
    isMocking(input: FetchInput): boolean;

    doMock(fn?: MockResponseInitFunction): FetchMock;
    doMock(response: string, responseInit?: MockParams): FetchMock;
    doMock(response: Response): FetchMock;

    doMockOnce(fn?: MockResponseInitFunction): FetchMock;
    doMockOnce(response: string, responseInit?: MockParams): FetchMock;
    doMockOnce(response: Response): FetchMock;
    // alias for doMockOnce
    mockOnce(fn?: MockResponseInitFunction): FetchMock;
    mockOnce(response: string, responseInit?: MockParams): FetchMock;
    mockOnce(response: Response): FetchMock;

    doMockIf(urlOrPredicate: UrlOrPredicate, fn?: MockResponseInitFunction): FetchMock;
    doMockIf(urlOrPredicate: UrlOrPredicate, response: string, responseInit?: MockParams): FetchMock;
    doMockIf(urlOrPredicate: UrlOrPredicate, response: Response): FetchMock;
    // alias for doMockIf
    mockIf(urlOrPredicate: UrlOrPredicate, fn?: MockResponseInitFunction): FetchMock;
    mockIf(urlOrPredicate: UrlOrPredicate, response: string, responseInit?: MockParams): FetchMock;
    mockIf(urlOrPredicate: UrlOrPredicate, response: Response): FetchMock;

    doMockOnceIf(urlOrPredicate: UrlOrPredicate, fn?: MockResponseInitFunction): FetchMock;
    doMockOnceIf(urlOrPredicate: UrlOrPredicate, response: string, responseInit?: MockParams): FetchMock;
    doMockOnceIf(urlOrPredicate: UrlOrPredicate, response: Response): FetchMock;
    // alias for doMockOnceIf
    mockOnceIf(urlOrPredicate: UrlOrPredicate, fn?: MockResponseInitFunction): FetchMock;
    mockOnceIf(urlOrPredicate: UrlOrPredicate, response: string, responseInit?: MockParams): FetchMock;
    mockOnceIf(urlOrPredicate: UrlOrPredicate, response: Response): FetchMock;

    dontMock(fn?: MockResponseInitFunction): FetchMock;
    dontMock(response: string, responseInit?: MockParams): FetchMock;
    dontMock(response: Response): FetchMock;

    dontMockOnce(fn?: MockResponseInitFunction): FetchMock;
    dontMockOnce(response: string, responseInit?: MockParams): FetchMock;
    dontMockOnce(response: Response): FetchMock;

    dontMockIf(urlOrPredicate: UrlOrPredicate, fn?: MockResponseInitFunction): FetchMock;
    dontMockIf(urlOrPredicate: UrlOrPredicate, response: string, responseInit?: MockParams): FetchMock;
    dontMockIf(urlOrPredicate: UrlOrPredicate, response: Response): FetchMock;

    dontMockOnceIf(urlOrPredicate: UrlOrPredicate, fn?: MockResponseInitFunction): FetchMock;
    dontMockOnceIf(urlOrPredicate: UrlOrPredicate, response: string, responseInit?: MockParams): FetchMock;
    dontMockOnceIf(urlOrPredicate: UrlOrPredicate, response: Response): FetchMock;

    resetMocks(): void;
    enableMocks(): FetchMock;
    disableMocks(): FetchMock;
    enableFetchMocks(): FetchMock;
    disableFetchMocks(): FetchMock;

    /** The implementation unmatched (dontMock'd) requests pass through to. Reassignable in tests. */
    realFetch: FetchImplementation;
    /** Optional init merged under every mocked response's own init - e.g. default headers. */
    defaultResponseInit: MockParams | undefined;
    /** True when the environment's own fetch primitives are in use (no fallback engaged). */
    usingNativeFetch: boolean;

    Headers: typeof Headers;
    Request: typeof Request;
    Response: {
        (body?: unknown, init?: MockParams): Response;
        redirect(url: string | URL, status?: number): Response;
        error(): Response;
        /** Present when the backing Response class provides it (native fetch; not node-fetch 2). */
        json?(data: unknown, init?: ResponseInit): Response;
    };
}

export interface MockParams {
    status?: number;
    statusText?: string;
    headers?: string[][] | { [key: string]: string }; // HeadersInit
    url?: string;
    /** Set >= 1 to have redirected return true. */
    counter?: number;
}

export interface MockResponseInit extends MockParams {
    body?: string;
    init?: MockParams;
}

export type ErrorOrFunction = Error | ((...args: any[]) => Promise<any>);
export type UrlOrPredicate = string | RegExp | ((input: Request) => boolean);

export type MockResponseInitFunction = (
    request: Request
) => MockResponseInit | string | Response | Promise<MockResponseInit | string | Response>;

/** Anything with a jest-compatible mock-function factory (the jest object itself qualifies). */
export interface MockFunctionFactory {
    fn(implementation?: (...args: any[]) => any): any;
    setMock?(moduleName: string, moduleExports: unknown): unknown;
    dontMock?(moduleName: string): unknown;
}

/**
 * Build a FetchMock bound to an explicitly provided jest object - for
 * `injectGlobals: false` setups: pass the `jest` imported from '@jest/globals'.
 * Also available dependency-free from 'jest-fetch-mock/factory'.
 */
export function createFetchMock(jestLike: MockFunctionFactory): FetchMock;

// alias of fetchMock.enableMocks() for ES6 import syntax to not clash with other libraries
export function enableFetchMocks(): FetchMock;
// alias of fetchMock.disableMocks() for ease of ES6 import syntax to not clash with other libraries
export function disableFetchMocks(): FetchMock;

declare const fetchMock: FetchMock;

export default fetchMock;
