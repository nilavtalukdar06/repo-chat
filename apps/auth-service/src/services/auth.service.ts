import { ApiError } from "@/core/api-error";
import { AuthRepository } from "@/repositories/auth.repository";
import { AuthUser } from "@/types/express";
import { regenerateSession, saveSession } from "@/utils/session-utils";
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
        message: "user already exists",
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
    if (!user) {
      throw new ApiError({
        statusCode: StatusCodes.NOT_FOUND,
        message: "user doesn't exist",
      });
    }
    const isCorrectPassword = await bcrypt.compare(
      input.password,
      user.password,
    );
    if (!isCorrectPassword) {
      throw new ApiError({
        statusCode: StatusCodes.UNAUTHORIZED,
        message: "either email or password is incorrect",
      });
    }
    await regenerateSession(req);
    req.session.userId = user.id;
    await saveSession(req);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
