"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
            {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    );
}

export function DashboardNav() {
    const pathname = usePathname();
    const params = useParams();
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

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
        <nav className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex justify-between h-14">
                    <div className="flex items-center gap-8">
                        <Link href={`${basePath}/dashboard`} className="font-semibold text-gray-900 dark:text-white">
                            Light House
                        </Link>
                        <div className="hidden md:flex gap-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`text-sm ${
                                        isActive(item.href)
                                            ? "text-gray-900 font-medium dark:text-white"
                                            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    {/* Desktop right side */}
                    <div className="hidden md:flex items-center gap-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
                        <Link
                            href={`${basePath}/settings`}
                            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Settings"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </Link>
                        <ThemeToggle />
                        <button
                            onClick={logout}
                            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                            Logout
                        </button>
                    </div>
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden flex items-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        {mobileOpen ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`block py-2 text-sm rounded-lg px-3 ${
                                isActive(item.href)
                                    ? "text-gray-900 font-medium bg-gray-50 dark:text-white dark:bg-gray-700"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Link
                        href={`${basePath}/settings`}
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-lg px-3"
                    >
                        Settings
                    </Link>
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 px-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate mr-3">{user?.email}</span>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <button
                                onClick={() => { setMobileOpen(false); logout(); }}
                                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
