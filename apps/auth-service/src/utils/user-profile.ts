import { redis } from "@/lib/redis";
import { AuthRepository } from "@/repositories/auth.repository";
import { AuthUser } from "@/types/express";

const PROFILE_TTL_SECONDS = 300;

export async function getUserProfile(userId: string): Promise<AuthUser | null> {
  const cacheKey = `user:${userId}:profile`;
  const cachedProfile = await redis.get(cacheKey);
  if (cachedProfile) {
    return JSON.parse(cachedProfile) as AuthUser;
  }
  const user = await AuthRepository.get(userId);
  if (!user) {
    return null;
  }
  const profile: AuthUser = user;
  await redis.set(cacheKey, JSON.stringify(profile), "EX", PROFILE_TTL_SECONDS);
  return profile;
}
