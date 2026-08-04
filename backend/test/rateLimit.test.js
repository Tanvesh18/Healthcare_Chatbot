import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../middleware/rateLimit.js";

function response() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function invoke(limiter, req) {
  const res = response();
  let continued = false;
  limiter(req, res, () => { continued = true; });
  return { res, continued };
}

test("allows requests up to the configured limit", () => {
  const limiter = createRateLimiter({ max: 2, windowMs: 60_000, now: () => 1_000 });

  const first = invoke(limiter, { ip: "127.0.0.1" });
  const second = invoke(limiter, { ip: "127.0.0.1" });

  assert.equal(first.continued, true);
  assert.equal(second.continued, true);
  assert.equal(second.res.headers["RateLimit-Remaining"], 0);
});

test("returns a consistent 429 response when the limit is exceeded", () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 60_000, now: () => 1_000 });
  invoke(limiter, { ip: "127.0.0.1" });

  const blocked = invoke(limiter, { ip: "127.0.0.1" });

  assert.equal(blocked.continued, false);
  assert.equal(blocked.res.statusCode, 429);
  assert.deepEqual(blocked.res.body, {
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
    retryAfterSeconds: 60
  });
  assert.equal(blocked.res.headers["Retry-After"], 60);
});

test("tracks authenticated users independently and resets expired windows", () => {
  let timestamp = 1_000;
  const limiter = createRateLimiter({ max: 1, windowMs: 1_000, now: () => timestamp });

  assert.equal(invoke(limiter, { auth: { id: "user-a" }, ip: "shared" }).continued, true);
  assert.equal(invoke(limiter, { auth: { id: "user-b" }, ip: "shared" }).continued, true);
  assert.equal(invoke(limiter, { auth: { id: "user-a" }, ip: "shared" }).res.statusCode, 429);

  timestamp = 2_000;
  assert.equal(invoke(limiter, { auth: { id: "user-a" }, ip: "shared" }).continued, true);
});
