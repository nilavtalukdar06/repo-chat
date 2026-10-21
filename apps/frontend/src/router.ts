import { createBrowserRouter } from "react-router";
import Home from "@/routes/home";
import NotFound from "@/routes/not-found";
import RootLayout from "@/routes/root-layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: "*", Component: NotFound },
    ],
  },
]);
