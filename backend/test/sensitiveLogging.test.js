import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceFiles = [
  new URL("../routes/chat.js", import.meta.url),
  new URL("../server.js", import.meta.url),
  new URL("../../frontend/src/MainApp.js", import.meta.url)
];

test("application logs exclude health data, messages, and precise coordinates", async () => {
  const sources = await Promise.all(sourceFiles.map(file => readFile(file, "utf8")));
  const logCalls = sources
    .flatMap(source => source.split("\n"))
    .filter(line => /console\.(?:log|info|warn|error)\s*\(/.test(line));

  for (const line of logCalls) {
    assert.doesNotMatch(
      line,
      /\b(?:lat|latitude|lng|longitude|coordinates?|location|messages?|profile|healthProfile|req\.body|user)\b/i,
      `Sensitive value referenced by log call: ${line.trim()}`
    );
  }
});
