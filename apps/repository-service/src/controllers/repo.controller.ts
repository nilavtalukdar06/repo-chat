import { REPO_MESSAGES } from "@/constants/repository.messages";
import { asyncHandler } from "@/core/async-handler";
import { sendResponse } from "@/core/response";
import { Status } from "@/generated/prisma/client";
import { LogService } from "@/services/log.service";
import { RepoService } from "@/services/repo.service";
import type {
  CreateRepoInput,
  ListRepoQuery,
  RepoIdParams,
  UpdateRepoStatusInput,
} from "@/validators/repository";
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

export abstract class RepoController {
  static create: RequestHandler = asyncHandler(async (req, res) => {
    const { githubUrl } = req.body as CreateRepoInput;
    const repository = await RepoService.create(githubUrl, req.userId!);
    sendResponse(
      res,
      StatusCodes.CREATED,
      REPO_MESSAGES.CREATE_SUCCESS,
      repository,
    );
  });

  static get: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as RepoIdParams;
    const repository = await RepoService.get(id);
    sendResponse(res, StatusCodes.OK, REPO_MESSAGES.FETCH_SUCCESS, repository);
  });

  static getAll: RequestHandler = asyncHandler(async (req, res) => {
    const { data, meta } = await RepoService.getAll(
      req.userId!,
      req.query as unknown as ListRepoQuery,
    );
    sendResponse(
      res,
      StatusCodes.OK,
      REPO_MESSAGES.LIST_FETCH_SUCCESS,
      data,
      meta,
    );
  });

  static update: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as RepoIdParams;
    const { status } = req.body as UpdateRepoStatusInput;
    const repository = await RepoService.update(id, status as Status);
    sendResponse(res, StatusCodes.OK, REPO_MESSAGES.UPDATE_SUCCESS, repository);
  });

  static getLogs: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as RepoIdParams;
    const logs = await LogService.getAll(id, req.userId!);
    sendResponse(res, StatusCodes.OK, REPO_MESSAGES.LOGS_FETCH_SUCCESS, logs);
  });

  static delete: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as RepoIdParams;
    const repository = await RepoService.delete(id);
    sendResponse(res, StatusCodes.OK, REPO_MESSAGES.DELETE_SUCCESS, repository);
  });
}
