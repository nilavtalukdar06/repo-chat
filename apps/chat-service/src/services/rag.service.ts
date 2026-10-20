import { ChatRole, type Messages } from "@/generated/prisma/client";
import {
  QueryRouterService,
  type QueryStrategy,
} from "@/services/query-router.service";
import { QueryTransformService } from "@/services/query-transform.service";
import type { Repository } from "@/services/repository.service";
import {
  RetrievalService,
  type RetrievedChunk,
} from "@/services/retrieval.service";

const TRANSCRIPT_TURNS = 6;
const TRANSCRIPT_MESSAGE_CHARS = 600;

export type RetrievalStage = "analyzing" | "searching" | "reranking";

export interface RetrievalResult {
  strategy: QueryStrategy;
  searchQuery: string;
  chunks: RetrievedChunk[];
}

function formatConversation(history: Messages[], question: string): string {
  const turns = history
    .filter(
      (record) =>
        record.role === ChatRole.USER || record.role === ChatRole.ASSISTANT,
    )
    .slice(-TRANSCRIPT_TURNS)
    .map(
      (record) =>
        `${record.role === ChatRole.USER ? "User" : "Assistant"}: ${record.message.slice(0, TRANSCRIPT_MESSAGE_CHARS)}`,
    );
  const earlier = turns.length
    ? `Earlier conversation:\n${turns.join("\n\n")}\n\n`
    : "";
  return `${earlier}Latest user message:\n${question}`;
}

function escapeChunk(content: string): string {
  return content.replaceAll("</chunk>", "<\\/chunk>");
}

export function withContext(question: string, chunks: RetrievedChunk[]) {
  if (chunks.length === 0) {
    return `${question}\n\n<context>\nNo code relevant to this question was found in the repository.\n</context>`;
  }
  const blocks = chunks.map(
    (chunk, index) =>
      `<chunk index="${index + 1}" path="${chunk.filePath}" lines="${chunk.startLine}-${chunk.endLine}" language="${chunk.language}">\n${escapeChunk(chunk.content)}\n</chunk>`,
  );
  return `${question}\n\n<context>\n${blocks.join("\n")}\n</context>`;
}

export abstract class RagService {
  static async retrieve(
    input: {
      question: string;
      history: Messages[];
      repository: Repository;
      userId: string;
    },
    onStage: (stage: RetrievalStage) => void,
  ): Promise<RetrievalResult> {
    const { question, history, repository, userId } = input;
    const conversation = formatConversation(history, question);

    onStage("analyzing");
    const strategy = await QueryRouterService.route(conversation, repository);
    if (strategy === "off_topic") {
      return { strategy, searchQuery: question, chunks: [] };
    }

    let searchQuery = question;
    let denseText = question;
    if (strategy === "rewrite") {
      searchQuery =
        (await QueryTransformService.rewrite(conversation, repository)) ??
        question;
      denseText = searchQuery;
    } else if (strategy === "hyde") {
      const [rewritten, hypothetical] = await Promise.all([
        history.length
          ? QueryTransformService.rewrite(conversation, repository)
          : Promise.resolve(null),
        QueryTransformService.hyde(conversation, repository),
      ]);
      searchQuery = rewritten ?? question;
      denseText = hypothetical
        ? `Language: ${repository.language}\n\n${hypothetical}`
        : searchQuery;
    }

    onStage("searching");
    const lists = await RetrievalService.search({
      denseText,
      lexicalText: searchQuery,
      scope: { repositoryId: repository.id, userId },
    });

    onStage("reranking");
    const chunks = await RetrievalService.rerank(searchQuery, lists);
    return { strategy, searchQuery, chunks };
  }
}
