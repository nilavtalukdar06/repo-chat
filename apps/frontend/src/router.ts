import { createBrowserRouter } from "react-router";
import { requireGuestLoader, requireUserLoader } from "@/features/auth/guards";
import { PageSkeleton } from "@/components/page-skeleton";
import NotFound from "@/routes/not-found";
import RouteError from "@/routes/route-error";
import RootLayout from "@/routes/root-layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    HydrateFallback: PageSkeleton,
    ErrorBoundary: RouteError,
    children: [
      {
        loader: requireGuestLoader,
        children: [
          {
            path: "signin",
            lazy: async () => ({
              Component: (await import("@/routes/signin")).default,
            }),
          },
          {
            path: "signup",
            lazy: async () => ({
              Component: (await import("@/routes/signup")).default,
            }),
          },
        ],
      },
      {
        loader: requireUserLoader,
        lazy: async () => ({
          Component: (await import("@/routes/app-layout")).default,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("@/routes/new-chat")).default,
            }),
          },
          {
            path: "repositories",
            lazy: async () => ({
              Component: (await import("@/routes/repositories")).default,
            }),
          },
          {
            path: "repositories/:repositoryId/logs",
            lazy: async () => ({
              Component: (await import("@/routes/repository-logs")).default,
            }),
          },
          {
            path: "chat/:chatId",
            lazy: async () => ({
              Component: (await import("@/routes/chat")).default,
            }),
          },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
