import { Outlet } from "react-router";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

function OpenSidebarTrigger() {
  const { open, isMobile } = useSidebar();

  if (open && !isMobile) return null;

  return (
    <header className="p-3">
      <SidebarTrigger />
    </header>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <OpenSidebarTrigger />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
