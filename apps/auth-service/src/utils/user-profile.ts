import { redis } from "@/lib/redis";
import { AuthRepository } from "@/repositories/auth.repository";
import { AuthUser } from "@/types/express";

const PROFILE_TTL_SECONDS = 300;

function reviveAuthUser(raw: AuthUser): AuthUser {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export async function getUserProfile(userId: string): Promise<AuthUser | null> {
  const cacheKey = `user:${userId}:profile`;

  const cachedProfile = await redis.get(cacheKey);
  if (cachedProfile) {
    return reviveAuthUser(JSON.parse(cachedProfile) as AuthUser);
  }

  const user = await AuthRepository.get(userId);
  if (!user) {
    return null;
  }

  await redis.set(cacheKey, JSON.stringify(user), "EX", PROFILE_TTL_SECONDS);
  return user;
}
