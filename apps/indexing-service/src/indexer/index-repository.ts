import { logger } from "@/config/logger";
import { chunkRepository, type CodeChunk } from "@/indexer/chunk";
import { embedChunkStream, type IndexScope } from "@/indexer/embed";
import {
  deleteRepositoryVectors,
  ensureCollection,
  upsertChunks,
} from "@/indexer/store";
import { report } from "@/utils/report";

export class IndexingError extends Error {}

async function stage<T>(name: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof IndexingError) throw error;
    throw new IndexingError(`failed while ${name}`, { cause: error });
  }
}

export async function indexRepository(root: string, scope: IndexScope) {
  await stage("preparing the vector store", async () => {
    await ensureCollection();
    await report("vector store is ready");
    await deleteRepositoryVectors(scope.repositoryId);
    await report("cleared previously indexed code");
  });
  await report("reading, chunking and embedding source files");
  const files = new Set<string>();
  let skippedFiles = 0;
  let storedChunks = 0;
  async function* chunks(): AsyncGenerator<CodeChunk> {
    const source = chunkRepository(root, (file, error) => {
      skippedFiles++;
      logger.warn(
        { file: file.relativePath, error },
        "skipped unparsable file",
      );
    });
    for await (const chunk of source) {
      files.add(chunk.filePath);
      yield chunk;
    }
  }
  await stage("chunking and embedding the code", async () => {
    for await (const batch of embedChunkStream(chunks(), scope)) {
      await stage("storing vectors in the vector store", () =>
        upsertChunks(batch),
      );
      storedChunks += batch.length;
      await report(`stored ${storedChunks} chunks from ${files.size} files`);
    }
  });
  if (storedChunks === 0) {
    throw new IndexingError("no supported source files were found");
  }
  const skipped = skippedFiles > 0 ? `, skipped ${skippedFiles} files` : "";
  await report(
    `finished indexing ${storedChunks} chunks from ${files.size} files${skipped}`,
  );
}
