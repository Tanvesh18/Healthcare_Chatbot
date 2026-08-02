export function createSseParser(onData) {
  let buffer = "";

  function drain(allowIncomplete = false) {
    while (buffer) {
      const boundary = buffer.match(/\r?\n\r?\n/);
      if (!boundary) {
        if (!allowIncomplete) return;
      }

      const boundaryIndex = boundary ? boundary.index : buffer.length;
      const frame = buffer.slice(0, boundaryIndex);
      buffer = boundary
        ? buffer.slice(boundaryIndex + boundary[0].length)
        : "";
      const data = frame
        .split(/\r?\n/)
        .filter(line => line.startsWith("data:"))
        .map(line => line.slice(5).replace(/^ /, ""))
        .join("\n");

      if (data) onData(data);
    }
  }

  return {
    push(chunk) {
      buffer += chunk;
      drain(false);
    },
    finish() {
      drain(true);
    }
  };
}
