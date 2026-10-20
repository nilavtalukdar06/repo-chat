import path from "node:path";
import { globbyStream } from "globby";
import pack from "@kreuzberg/tree-sitter-language-pack";

export interface SourceFile {
  absolutePath: string;
  relativePath: string;
  language: string;
}

const MAX_FILE_BYTES = 512 * 1024;

const IGNORED_PATTERNS = [
  "**/{.git,node_modules,vendor,dist,build,out,target,coverage,.next,.nuxt,.turbo,.cache,.venv,venv,__pycache__,.idea,.vscode}/**",
  "**/{package-lock.json,pnpm-lock.yaml,yarn.lock,bun.lock,bun.lockb,Cargo.lock,poetry.lock,Pipfile.lock,composer.lock,Gemfile.lock,go.sum}",
  "**/*.{lock,map}",
  "**/*.min.{js,css}",
  "**/*.pb.go",
  "**/*_pb2*.py",
  "**/*.generated.*",
  "**/.env*",
  "**/.npmrc",
  "**/id_{rsa,dsa,ecdsa,ed25519}",
  "**/*.{pem,key,crt,cer,p12,pfx,jks,keystore}",
];

function detectLanguage(relativePath: string): string | null {
  const language = pack.detectLanguageFromPath(relativePath);
  return language && pack.hasLanguage(language) ? language : null;
}

export async function* walkSourceFiles(
  root: string,
): AsyncGenerator<SourceFile> {
  const entries = globbyStream("**/*", {
    cwd: root,
    gitignore: true,
    ignore: IGNORED_PATTERNS,
    dot: true,
    followSymbolicLinks: false,
    objectMode: true,
    stats: true,
  });

  for await (const { path: relativePath, stats } of entries) {
    const language = detectLanguage(relativePath);
    if (!language) continue;
    if (!stats || stats.size === 0 || stats.size > MAX_FILE_BYTES) continue;
    yield {
      absolutePath: path.join(root, relativePath),
      relativePath,
      language,
    };
  }
}
