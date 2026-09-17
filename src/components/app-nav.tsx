"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const authenticatedNavigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/skills", label: "Skills" },
  { href: "/assessments", label: "Assessments" },
  { href: "/hackathons", label: "Hackathons" },
  { href: "/team", label: "Team" },
];

export default function AppNav() {
  const pathname = usePathname();
  const { profile, firebaseUser, authState, loading, signIn, signOut } = useAuth();

  const [signingOut, setSigningOut] = useState(false);

  const isAuthenticated =
    authState === "AUTHENTICATED" || (!loading && (Boolean(profile) || Boolean(firebaseUser)));
  const displayName = profile?.displayName || firebaseUser?.displayName || null;
  const photoUrl = profile?.photoUrl || firebaseUser?.photoURL || null;

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || authState === "LOADING") {
    return (
      <div className="flex items-center text-xs text-stone-400">
        <span>Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => void signIn()}
          className="inline-flex h-8 items-center border border-stone-900 bg-stone-900 px-3 text-xs font-medium text-stone-50 hover:bg-stone-800 active:bg-stone-950 transition-colors focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
      <nav
        aria-label="Primary navigation"
        className="max-w-full overflow-x-auto overflow-y-hidden py-1 sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex min-w-max items-center gap-5 text-sm text-stone-600">
          {authenticatedNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/assessments" && pathname.startsWith("/assessments")) ||
              (item.href === "/hackathons" && pathname.startsWith("/hackathons")) ||
              (item.href === "/team" && (pathname.startsWith("/team") || pathname.startsWith("/teammates")));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`whitespace-nowrap transition-colors pb-1 border-b-2 ${
                    isActive
                      ? "font-semibold text-stone-950 border-stone-900"
                      : "border-transparent text-stone-600 hover:text-stone-950 hover:border-stone-400"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3 border-l border-stone-300 pl-3 text-xs">
        <div className="flex items-center gap-2">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={displayName ?? "User"}
              className="h-6 w-6 rounded-full border border-stone-300 object-cover"
            />
          ) : displayName ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 font-semibold text-stone-100">
              {displayName.charAt(0).toUpperCase()}
            </span>
          ) : null}
          {displayName && (
            <Link
              href="/profile"
              className="max-w-[120px] truncate font-medium text-stone-900 hover:text-stone-700 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              title={displayName}
            >
              {displayName.split(" ")[0]}
            </Link>
          )}
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="ml-1 text-stone-500 hover:text-stone-950 hover:underline transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}
