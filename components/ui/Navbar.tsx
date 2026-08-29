"use client";

/**
 * Application navigation.
 *
 * Reads the session from AuthProvider rather than fetching `/api/auth/me`
 * itself — the previous version re-fetched on every route change, which meant
 * an extra request per navigation and a visible flicker of the signed-out
 * state.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCompare } from "@/components/providers/CompareProvider";

const NAV_LINKS = [
  { href: "/colleges", label: "Colleges" },
  { href: "/compare", label: "Compare" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, signOut } = useAuth();
  const { count: compareCount } = useCompare();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menus are closed by the handlers below (`closeMenus`) rather than by an
  // effect watching `pathname`. Reacting to the navigation would set state
  // during the render that follows it, causing an extra render pass.
  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsMobileOpen(false);
  };

  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display font-bold text-xl text-slate-900"
          >
            <span
              className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              aria-hidden="true"
            >
              CD
            </span>
            <span className="hidden sm:block">CollegeDiscover</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenus}
                aria-current={isActive(href) ? "page" : undefined}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {label}
                {href === "/compare" && compareCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 bg-indigo-600 text-white text-xs rounded-full">
                    {compareCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <div className="w-24 h-8 skeleton rounded-lg" aria-hidden="true" />
            ) : user ? (
              <>
                <Link
                  href="/saved"
                  onClick={closeMenus}
                  aria-current={isActive("/saved") ? "page" : undefined}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/saved")
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  ★ Saved
                </Link>

                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen((open) => !open)}
                    aria-expanded={isMenuOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <span
                      className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                      aria-hidden="true"
                    >
                      {user.name.charAt(0)}
                    </span>
                    <span className="text-sm text-slate-700 max-w-[100px] truncate">
                      {user.name.split(" ")[0]}
                    </span>
                  </button>

                  {isMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1"
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href="/saved"
                        role="menuitem"
                        onClick={closeMenus}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        My saved colleges
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          closeMenus();
                          void signOut();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  Sign up free
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setIsMobileOpen((open) => !open)}
            aria-expanded={isMobileOpen}
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMenus}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium ${
                isActive(href) ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {label}
              {href === "/compare" && compareCount > 0 && ` (${compareCount})`}
            </Link>
          ))}

          {user ? (
            <>
              <Link
                href="/saved"
                onClick={closeMenus}
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                ★ Saved colleges
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeMenus();
                  void signOut();
                }}
                className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" onClick={closeMenus} className="btn btn-ghost btn-sm flex-1">
                Log in
              </Link>
              <Link href="/signup" onClick={closeMenus} className="btn btn-primary btn-sm flex-1">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
