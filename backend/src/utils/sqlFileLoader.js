const fs = require("fs");
const path = require("path");

const cache = new Map();

const parseNamedSql = (raw) => {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out = {};

  let currentName = null;
  let buffer = [];

  const flush = () => {
    if (!currentName) return;
    const text = buffer.join("\n").trim();
    out[currentName] = text;
    currentName = null;
    buffer = [];
  };

  for (const line of lines) {
    const match = line.match(/^\s*--\s*name:\s*([A-Za-z0-9_\-]+)/);
    if (match) {
      flush();
      currentName = match[1];
      continue;
    }

    if (currentName) {
      buffer.push(line);
    }
  }

  flush();
  return out;
};

const getSql = (controllerName) => {
  if (cache.has(controllerName)) {
    return cache.get(controllerName);
  }

  const sqlPath = path.resolve(
    __dirname,
    "..",
    "..",
    "sql",
    "controllers",
    controllerName,
    "queries.sql",
  );

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`SQL file not found: ${sqlPath}`);
  }

  const raw = fs.readFileSync(sqlPath, "utf8");
  const parsed = parseNamedSql(raw);

  cache.set(controllerName, parsed);
  return parsed;
};

module.exports = {
  getSql,
};
