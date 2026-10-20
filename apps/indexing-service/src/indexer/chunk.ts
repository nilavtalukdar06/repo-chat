import fs from "node:fs/promises";
import { CodeChunker } from "@chonkiejs/core";
import lineColumn from "line-column";
import { walkSourceFiles, type SourceFile } from "@/indexer/files";

export interface CodeChunk {
  filePath: string;
  language: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
  content: string;
}

const CHUNK_SIZE = 2000;
const MIN_CHUNK_CHARS = 20;
const FRAGMENT_CHARS = 100;

const chunkers = new Map<string, Promise<CodeChunker>>();

function getChunker(language: string): Promise<CodeChunker> {
  let chunker = chunkers.get(language);
  if (!chunker) {
    chunker = CodeChunker.create({
      language,
      chunkSize: CHUNK_SIZE,
      tokenizer: "character",
    });
    chunkers.set(language, chunker);
  }
  return chunker;
}

export async function chunkFile(file: SourceFile): Promise<CodeChunk[]> {
  const source = await fs.readFile(file.absolutePath, "utf-8");
  if (source.includes("\0")) return [];

  const chunker = await getChunker(file.language);
  const ranges: Array<{ start: number; end: number }> = [];

  for (const { text, startIndex } of chunker.chunk(source)) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    const start = startIndex + text.indexOf(trimmed);
    const end = start + trimmed.length;

    const previous = ranges.at(-1);
    if (previous && previous.end - previous.start < FRAGMENT_CHARS) {
      previous.end = end;
    } else {
      ranges.push({ start, end });
    }
  }

  const lines = lineColumn(source, { origin: 1 });
  return ranges
    .filter(({ start, end }) => end - start >= MIN_CHUNK_CHARS)
    .map(({ start, end }, chunkIndex) => ({
      filePath: file.relativePath,
      language: file.language,
      chunkIndex,
      startLine: lines.fromIndex(start)!.line,
      endLine: lines.fromIndex(end - 1)!.line,
      content: source.slice(start, end),
    }));
}

/** a file that fails to parse is reported and skipped, never fatal */
export async function* chunkRepository(
  root: string,
  onFileError?: (file: SourceFile, error: unknown) => void,
): AsyncGenerator<CodeChunk> {
  for await (const file of walkSourceFiles(root)) {
    try {
      yield* await chunkFile(file);
    } catch (error) {
      onFileError?.(file, error);
    }
  }
}
