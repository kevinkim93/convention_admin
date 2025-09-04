import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Home, Calendar, Users, PlusCircle } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 text-xl font-bold border-b">Convention Admin</div>
        <nav className="flex-1 flex flex-col p-2 space-y-1">
          <NavItem href="/admin" icon={<Home size={18} />}>
            대시보드
          </NavItem>
          <NavItem href="/admin/conventions/new" icon={<PlusCircle size={18} />}>
            컨벤션 생성
          </NavItem>
          <NavItem href="/admin/conventions" icon={<Calendar size={18} />}>
            컨벤션 목록
          </NavItem>
          <NavItem href="/admin/participants" icon={<Users size={18} />}>
            참여자 관리
          </NavItem>
        </nav>
        <div className="p-4 border-t text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Convention System
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-white shadow flex items-center justify-between px-6">
          <h1 className="font-semibold text-lg">관리자 페이지</h1>
          <div className="text-sm text-gray-600">관리자님 안녕하세요 👋</div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  children,
  icon,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 text-sm font-medium"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
