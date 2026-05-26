import type { NextApiRequest, NextApiResponse } from "next";

/** Creates a minimal NextApiRequest stand-in for handler tests. */
export function makeReq(
  overrides: Partial<{
    method: string;
    query: Record<string, string>;
    body: unknown;
  }> = {}
): NextApiRequest {
  return { method: "GET", query: {}, body: {}, ...overrides } as unknown as NextApiRequest;
}

/**
 * Creates a chainable mock NextApiResponse that records the status code, response
 * body, and whether end() was called — suitable for asserting handler output in
 * unit tests without a real HTTP server.
 */
export function makeRes() {
  const res: any = {
    _status: 0,
    _body: undefined,
    _ended: false,
    status(code: number) { this._status = code; return this; },
    json(body: unknown) { this._body = body; return this; },
    end() { this._ended = true; return this; },
  };
  return res as NextApiResponse & { _status: number; _body: unknown; _ended: boolean };
}
