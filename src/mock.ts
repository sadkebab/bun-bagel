import { MockOptions } from "./types";
import { findRequest, wildcardToRegex } from "./utils";

let ORIGINAL_FETCH: (request: Request, init?: RequestInit | undefined) => Promise<Response>;

/**
 * The cache for registered mocked requests.
 */
const MOCKED_REQUESTS = new Map<RegExp, MockOptions>();

/**
 * @description Mock the fetch method.
 */
export const mock = (request: Request | RegExp | string, options: MockOptions) => {
    const input = request instanceof Request ? request.url : request;

    // Create regex class from input.
    const regexInput = input instanceof RegExp ? input : new RegExp(wildcardToRegex(input.toString()));

    // Check if request is already mocked.
    const isRequestMocked = [...MOCKED_REQUESTS.entries()].find(findRequest([regexInput.toString(), options]));

    if (!isRequestMocked) {
        // Use regex as key.
        MOCKED_REQUESTS.set(regexInput, options);
        console.debug("Registered mocked request", input, regexInput);
    } else {
        console.debug("Request already mocked", regexInput);
        return;
    }

    if (!ORIGINAL_FETCH) {
        // Cache the original fetch method before mocking it. Might be useful in the future to clean the mock.
        ORIGINAL_FETCH = globalThis.fetch;

        // @ts-ignore
        globalThis.fetch = MOCKED_FETCH;
    }
}

/**
 * @description Clear the fetch mock.
 */
export const clearMocks = () => {
    MOCKED_REQUESTS.clear();
    // @ts-ignore
    globalThis.fetch = ORIGINAL_FETCH;
}

/**
 * @description A mocked fetch method.
 */
const MOCKED_FETCH = (_request: Request | RegExp | string, init?: RequestInit) => {
    const _path = _request instanceof Request ? _request.url : _request.toString();

    // When the request it fired, check if it matches a mocked request.
    const mockedRequest = [...MOCKED_REQUESTS.entries()].find(findRequest([_path, init]));

    if (!mockedRequest) {
        const errorPayload = {
            status: 404,
            ok: false,
            statusText: "Not Found",
            url: _path,
        };
        console.debug(errorPayload);
        return Promise.reject(errorPayload);
    }

    console.debug("Mocked fetch called:", _path, mockedRequest[0]);

    return Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve(mockedRequest[1].data),
    })
};

