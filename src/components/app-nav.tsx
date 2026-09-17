"use client";

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

  const isAuthenticated =
    authState === "AUTHENTICATED" || (!loading && (Boolean(profile) || Boolean(firebaseUser)));
  const displayName = profile?.displayName || firebaseUser?.displayName || null;
  const photoUrl = profile?.photoUrl || firebaseUser?.photoURL || null;

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
          className="inline-flex h-8 items-center border border-stone-900 bg-stone-900 px-3 text-xs font-medium text-stone-50 hover:bg-stone-800"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
      <nav aria-label="Primary navigation" className="max-w-full overflow-x-auto">
        <ul className="flex min-w-max items-center gap-4 text-sm text-stone-600">
          {authenticatedNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`whitespace-nowrap transition-colors hover:text-stone-950 ${
                    isActive ? "font-semibold text-stone-950 underline underline-offset-4" : ""
                  }`}
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
              className="max-w-[120px] truncate font-medium text-stone-900 hover:underline"
              title={displayName}
            >
              {displayName.split(" ")[0]}
            </Link>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="ml-1 text-stone-500 hover:text-stone-950 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
