"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth";

export function DashboardNav() {
  const pathname = usePathname();
  const params = useParams();
  const { user, logout } = useAuth();

  // F4 mitigation: prefer params, fallback to auth context
  const slug = (params?.slug as string) || user?.org_slug || "";
  const basePath = slug ? `/org/${slug}` : "";

  const navItems = [
    { href: `${basePath}/dashboard`, label: "Checks" },
    { href: `${basePath}/logs`, label: "Logs" },
  ];

  // Check if current path matches nav item (handle both old and new paths)
  const isActive = (href: string) => {
    if (pathname === href) return true;
    // Also match paths without org prefix for backwards compatibility
    const pathWithoutOrg = pathname.replace(/^\/org\/[^/]+/, "");
    const hrefWithoutOrg = href.replace(/^\/org\/[^/]+/, "");
    return pathWithoutOrg === hrefWithoutOrg;
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href={`${basePath}/dashboard`} className="font-semibold">
              Light House
            </Link>
            <div className="flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm ${
                    isActive(item.href)
                      ? "text-gray-900 font-medium"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
