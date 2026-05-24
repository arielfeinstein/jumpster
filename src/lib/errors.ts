import type { NextApiResponse } from "next";

/**
 * Domain error classes. Services throw these; routes catch and map to HTTP
 * status codes via handleError. Never put status codes in services directly.
 */

export class ValidationError extends Error {
  constructor(message = "Invalid input") {
    super(message);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Maps a thrown error to the appropriate HTTP response. Call this in the
 * catch block of every API route so status-code logic stays in one place.
 */
// todo: consider adding code to error class 
export function handleError(err: unknown, res: NextApiResponse): void {
  if (err instanceof ValidationError)
    return void res.status(400).json({ error: err.message });
  if (err instanceof UnauthorizedError)
    return void res.status(401).json({ error: err.message });
  if (err instanceof ForbiddenError)
    return void res.status(403).json({ error: err.message });
  if (err instanceof NotFoundError)
    return void res.status(404).json({ error: err.message });

  // Unexpected error — log it server-side, don't leak details to the client.
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
