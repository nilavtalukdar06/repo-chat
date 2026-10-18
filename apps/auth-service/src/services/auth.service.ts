import { AUTH_MESSAGES } from "@/constants/auth.messages";
import { ApiError } from "@/core/api-error";
import { AuthRepository, toAuthUser } from "@/repositories/auth.repository";
import { AuthUser } from "@/types/express";
import {
  deleteSession,
  regenerateSession,
  saveSession,
} from "@/utils/session-utils";
import { LoginInput, RegisterInput } from "@/validators/auth";
import bcrypt from "bcrypt";
import { Request } from "express";
import { StatusCodes } from "http-status-codes";

const SALT_ROUNDS = 10;

export abstract class AuthService {
  static async register(input: RegisterInput): Promise<void> {
    const existingUser = await AuthRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ApiError({
        statusCode: StatusCodes.CONFLICT,
        message: AUTH_MESSAGES.USER_ALREADY_EXISTS,
      });
    }
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(input.password, salt);
    await AuthRepository.create({
      ...input,
      password: hashedPassword,
    });
  }

  static async login(input: LoginInput, req: Request): Promise<AuthUser> {
    const user = await AuthRepository.findByEmail(input.email);
    const isCorrectPassword = await bcrypt.compare(
      input.password,
      user?.password ?? "",
    );
    if (!user || !isCorrectPassword) {
      throw new ApiError({
        statusCode: StatusCodes.UNAUTHORIZED,
        message: AUTH_MESSAGES.INVALID_CREDENTIALS,
      });
    }
    await regenerateSession(req);
    req.session.userId = user.id;
    await saveSession(req);
    return toAuthUser(user);
  }

  static async logout(req: Request): Promise<void> {
    await deleteSession(req);
  }
}
