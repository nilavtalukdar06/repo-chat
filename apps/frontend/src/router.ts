import { createBrowserRouter } from "react-router";
import { requireGuestLoader, requireUserLoader } from "@/features/auth/guards";
import NotFound from "@/routes/not-found";
import RootLayout from "@/routes/root-layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
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
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("@/routes/home")).default,
            }),
          },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
