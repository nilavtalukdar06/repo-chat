import { FolderGitIcon, SquarePenIcon } from "lucide-react";
import { Link, useMatch } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from "@/features/auth/components/nav-user";
import { RecentChats } from "@/features/chats/components/recent-chats";

type NavItemProps = {
  to: string;
  label: string;
  icon: typeof SquarePenIcon;
  end?: boolean;
};

function NavItem({ to, label, icon: Icon, end = false }: NavItemProps) {
  const { setOpenMobile } = useSidebar();
  const isActive = useMatch({ path: to, end }) !== null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        className="gap-3 rounded-md text-sm data-active:font-normal"
        render={<Link to={to} />}
        onClick={() => setOpenMobile(false)}
      >
        <Icon size={16} />
        <span className="font-light">{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center justify-between p-3">
        <span className="text-lg font-semibold tracking-tight">RepoChat</span>
        <SidebarTrigger className="text-muted-foreground" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="">
          <SidebarMenu>
            <NavItem to="/" label="New chat" icon={SquarePenIcon} end />
            <NavItem
              to="/repositories"
              label="Repositories"
              icon={FolderGitIcon}
            />
          </SidebarMenu>
        </SidebarGroup>
        <RecentChats />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
