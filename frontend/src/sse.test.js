import { createSseParser } from "./utils/sse";

test("retains fragmented SSE frames until they are complete", () => {
  const events = [];
  const parser = createSseParser(data => events.push(data));

  parser.push("data: Hel");
  parser.push("lo\n\ndata: world\n");
  expect(events).toEqual(["Hello"]);

  parser.push("\n");
  expect(events).toEqual(["Hello", "world"]);
});

test("joins multi-line SSE data with line breaks", () => {
  const events = [];
  const parser = createSseParser(data => events.push(data));

  parser.push("data: First line\r\ndata: Second line\r\n\r\n");

  expect(events).toEqual(["First line\nSecond line"]);
});

test("handles completion and error events", () => {
  const events = [];
  const parser = createSseParser(data => events.push(data));

  parser.push("data: [ERROR]\n\ndata: [DONE]\n\n");

  expect(events).toEqual(["[ERROR]", "[DONE]"]);
});
