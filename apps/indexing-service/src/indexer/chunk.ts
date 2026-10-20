import fs from "node:fs/promises";
import { CodeChunker } from "@chonkiejs/core";
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

function lineStartOffsets(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function lineAt(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >>> 1;
    if (starts[mid]! <= offset) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

export async function chunkFile(file: SourceFile): Promise<CodeChunk[]> {
  const source = await fs.readFile(file.absolutePath, "utf-8");
  if (source.includes("\0")) return [];
  const chunker = await getChunker(file.language);
  const ranges: Array<{ start: number; end: number }> = [];
  for (const chunk of chunker.chunk(source)) {
    const content = chunk.text.trim();
    if (!content) continue;
    const start =
      chunk.startIndex + (chunk.text.length - chunk.text.trimStart().length);
    const previous = ranges.at(-1);
    if (previous && previous.end - previous.start < FRAGMENT_CHARS) {
      previous.end = start + content.length;
    } else {
      ranges.push({ start, end: start + content.length });
    }
  }

  const starts = lineStartOffsets(source);
  const chunks: CodeChunk[] = [];
  for (const { start, end } of ranges) {
    const content = source.slice(start, end);
    if (content.length < MIN_CHUNK_CHARS) continue;
    chunks.push({
      filePath: file.relativePath,
      language: file.language,
      chunkIndex: chunks.length,
      startLine: lineAt(starts, start),
      endLine: lineAt(starts, end - 1),
      content,
    });
  }
  return chunks;
}

export async function* chunkRepository(
  root: string,
  onFileError?: (file: SourceFile, error: unknown) => void,
): AsyncGenerator<CodeChunk[]> {
  for await (const file of walkSourceFiles(root)) {
    try {
      const chunks = await chunkFile(file);
      if (chunks.length > 0) yield chunks;
    } catch (error) {
      onFileError?.(file, error);
    }
  }
}
