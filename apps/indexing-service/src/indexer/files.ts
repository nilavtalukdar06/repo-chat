import fs from "node:fs/promises";
import path from "node:path";
import ignore, { type Ignore } from "ignore";
import pack from "@kreuzberg/tree-sitter-language-pack";

export interface SourceFile {
  absolutePath: string;
  relativePath: string;
  language: string;
}

const MAX_FILE_BYTES = 512 * 1024;

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "target",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  ".vscode",
]);

const SKIPPED_FILE_NAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "poetry.lock",
  "Pipfile.lock",
  "composer.lock",
  "Gemfile.lock",
  "go.sum",
]);

const SKIPPED_FILE_PATTERNS = [
  /^\.env(\..+)?$/,
  /^\.npmrc$/,
  /^id_(rsa|dsa|ecdsa|ed25519)$/,
  /\.(pem|key|crt|cer|p12|pfx|jks|keystore)$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /\.lock$/,
  /\.pb\.go$/,
  /_pb2(_grpc)?\.py$/,
  /\.generated\.[a-z]+$/,
];

async function loadGitignore(root: string): Promise<Ignore> {
  const matcher = ignore();
  try {
    matcher.add(await fs.readFile(path.join(root, ".gitignore"), "utf-8"));
  } catch {}
  return matcher;
}

function detectLanguage(relativePath: string): string | null {
  const language = pack.detectLanguageFromPath(relativePath);
  if (!language || !pack.hasLanguage(language)) return null;
  return language;
}

export async function* walkSourceFiles(
  root: string,
): AsyncGenerator<SourceFile> {
  const matcher = await loadGitignore(root);
  async function* walk(directory: string): AsyncGenerator<SourceFile> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path
        .relative(root, absolutePath)
        .split(path.sep)
        .join("/");
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
        if (matcher.ignores(`${relativePath}/`)) continue;
        yield* walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (SKIPPED_FILE_NAMES.has(entry.name)) continue;
      if (SKIPPED_FILE_PATTERNS.some((pattern) => pattern.test(entry.name))) {
        continue;
      }
      if (matcher.ignores(relativePath)) continue;
      const language = detectLanguage(relativePath);
      if (!language) continue;
      const { size } = await fs.stat(absolutePath);
      if (size === 0 || size > MAX_FILE_BYTES) continue;
      yield { absolutePath, relativePath, language };
    }
  }
  yield* walk(root);
}
