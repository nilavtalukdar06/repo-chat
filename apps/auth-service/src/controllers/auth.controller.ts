import { AUTH_MESSAGES } from "@/constants/auth.messages";
import { asyncHandler } from "@/core/async-handler";
import { sendResponse } from "@/core/response";
import { AuthService } from "@/services/auth.service";
import { clearSessionCookie } from "@/utils/session-utils";
import { LoginInput, RegisterInput } from "@/validators/auth";
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

export abstract class AuthController {
  static register: RequestHandler = asyncHandler(async (req, res) => {
    await AuthService.register(req.body as RegisterInput);
    sendResponse(res, StatusCodes.CREATED, AUTH_MESSAGES.REGISTER_SUCCESS);
  });

  static login: RequestHandler = asyncHandler(async (req, res) => {
    const user = await AuthService.login(req.body as LoginInput, req);
    sendResponse(res, StatusCodes.OK, AUTH_MESSAGES.LOGIN_SUCCESS, user);
  });

  static logout: RequestHandler = asyncHandler(async (req, res) => {
    await AuthService.logout(req);
    clearSessionCookie(res);
    sendResponse(res, StatusCodes.OK, AUTH_MESSAGES.LOGOUT_SUCCESS);
  });

  static getMe: RequestHandler = asyncHandler(async (req, res) => {
    sendResponse(res, StatusCodes.OK, AUTH_MESSAGES.PROFILE_FETCHED, req.user);
  });
}
