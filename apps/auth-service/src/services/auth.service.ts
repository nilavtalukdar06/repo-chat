import { ApiError } from "@/core/api-error";
import { AuthRepository } from "@/repositories/auth.repository";
import { RegisterInput } from "@/validators/auth";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";

const SALT_ROUNDS = 10;

export abstract class AuthService {
  static async register(input: RegisterInput) {
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
}
