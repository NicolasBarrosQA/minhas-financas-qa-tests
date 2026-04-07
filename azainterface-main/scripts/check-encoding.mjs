import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

const INCLUDED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".html",
  ".sql",
  ".yml",
  ".yaml",
]);

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vscode",
  "coverage",
  "dist",
  "node_modules",
]);

const MOJIBAKE_PATTERN = /(?:Ã|Â|â)[\u0080-\u00BF]|\uFFFD/u;

function isBinaryFile(buffer) {
  return buffer.includes(0);
}

function isSupportedTextFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return INCLUDED_EXTENSIONS.has(extension);
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function getLineAndColumn(content, index) {
  const before = content.slice(0, index);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

async function collectFiles(dirPath, output = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(absolutePath, output);
      continue;
    }

    if (!entry.isFile() || !isSupportedTextFile(absolutePath)) {
      continue;
    }

    output.push(absolutePath);
  }

  return output;
}

async function scanFile(filePath) {
  const buffer = await fs.readFile(filePath);
  if (isBinaryFile(buffer)) {
    return null;
  }

  let content = "";
  try {
    content = UTF8_DECODER.decode(buffer);
  } catch {
    return {
      type: "invalid_utf8",
      filePath,
      message: "invalid UTF-8 sequence detected",
    };
  }

  const mojibakeMatch = MOJIBAKE_PATTERN.exec(content);
  if (!mojibakeMatch || mojibakeMatch.index === undefined) {
    return null;
  }

  const location = getLineAndColumn(content, mojibakeMatch.index);
  return {
    type: "mojibake",
    filePath,
    line: location.line,
    column: location.column,
    snippet: mojibakeMatch[0],
    message: "possible mojibake sequence detected",
  };
}

function printIssue(issue) {
  const relativePath = toPosixPath(path.relative(ROOT_DIR, issue.filePath));
  if (issue.type === "invalid_utf8") {
    console.error(`- ${relativePath}: ${issue.message}`);
    return;
  }

  console.error(
    `- ${relativePath}:${issue.line}:${issue.column} ${issue.message} (match: ${JSON.stringify(issue.snippet)})`,
  );
}

async function main() {
  const files = await collectFiles(ROOT_DIR);
  const issues = [];

  for (const filePath of files) {
    const issue = await scanFile(filePath);
    if (issue) {
      issues.push(issue);
    }
  }

  if (issues.length === 0) {
    console.log(`Encoding check passed for ${files.length} files.`);
    return;
  }

  console.error("Encoding check failed.");
  for (const issue of issues) {
    printIssue(issue);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error("Encoding check failed with unexpected error.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
