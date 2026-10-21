import { redirect } from "react-router";
import { queryClient } from "@/lib/query-client";
import { sessionQueryOptions } from "./queries";

export async function requireUserLoader() {
  const user = await queryClient.fetchQuery(sessionQueryOptions);
  if (!user) throw redirect("/signin");
  return null;
}

export async function requireGuestLoader() {
  const user = await queryClient.fetchQuery(sessionQueryOptions);
  if (user) throw redirect("/");
  return null;
}
