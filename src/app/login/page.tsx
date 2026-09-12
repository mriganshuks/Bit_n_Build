import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn } from "@/auth";
import { findProfileConflict, findUserForLogin } from "@/lib/users";
import { getSessionUser } from "@/lib/session";

type LoginPageProps = {
  searchParams?: Promise<{
    mode?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getSessionUser();
  const params = await searchParams;
  const isLogin = params?.mode === "login";
  const errorMessage = params?.error;

  if (user?.id) {
    redirect(user.profileCompleted ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        PRAMAAN
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">
        {isLogin ? "Log in" : "Create your profile"}
      </h1>
      <p className="mt-3 max-w-md text-base leading-7 text-stone-600">
        {isLogin
          ? "Use your username, phone number, or email with your password."
          : "Create one platform identity. Your email can be verified later."}
      </p>

      {errorMessage && (
        <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <form
        className="mt-10 grid gap-5 border-t border-stone-300 pt-8"
        action={async (formData) => {
          "use server";

          const username = String(formData.get("username") ?? "");
          const phone = String(formData.get("phone") ?? "");
          const email = String(formData.get("email") ?? "");
          const identifier = String(formData.get("identifier") ?? "");
          const password = String(formData.get("password") ?? "");

          try {
            if (isLogin) {
              const user = await findUserForLogin(identifier, password);

              if (!user) {
                redirect(
                  `/login?mode=login&error=${encodeURIComponent("The login details are incorrect.")}`
                );
              }
            } else {
              const conflict = await findProfileConflict({
                username,
                phone,
                email,
              });

              if (conflict) {
                redirect(`/login?error=${encodeURIComponent(conflict)}`);
              }
            }

            await signIn("credentials", {
              mode: isLogin ? "login" : "signup",
              identifier,
              fullName: formData.get("fullName"),
              username,
              phone,
              email,
              password,
              redirectTo: "/dashboard",
            });
          } catch (error) {
            if (isRedirectError(error)) {
              throw error;
            }

            const errorText = error instanceof Error ? error.message : "";
            const isDatabaseError = /Mongo|SSL|database|connect/i.test(errorText);
            const message = isDatabaseError
              ? "The database is temporarily unavailable. Please try again."
              : errorText.includes("already registered")
                ? errorText
                : isLogin
                  ? "The login details are incorrect."
                  : "A profile with that username, phone number, or email already exists.";

            redirect(`/login${isLogin ? "?mode=login&" : "?"}error=${encodeURIComponent(message)}`);
          }
        }}
      >
        {isLogin ? (
          <label className="grid gap-2 text-sm font-medium text-stone-800">
            Username, phone, or email
            <input name="identifier" required className="h-11 border border-stone-300 px-3" />
          </label>
        ) : (
          <>
            <label className="grid gap-2 text-sm font-medium text-stone-800">
              Full name
              <input name="fullName" required minLength={2} className="h-11 border border-stone-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-800">
              Unique username
              <input name="username" required pattern="[a-zA-Z0-9_]{3,24}" className="h-11 border border-stone-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-800">
              Unique phone number
              <input name="phone" required type="tel" pattern="\+?[1-9][0-9]{7,14}" className="h-11 border border-stone-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-800">
              Email address
              <input name="email" required type="email" className="h-11 border border-stone-300 px-3" />
            </label>
          </>
        )}
        <label className="grid gap-2 text-sm font-medium text-stone-800">
          Password
          <input name="password" required minLength={8} type="password" className="h-11 border border-stone-300 px-3" />
        </label>
        <button type="submit" className="mt-3 h-11 border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800">
          {isLogin ? "Log in" : "Create profile and continue"}
        </button>
      </form>

      <a
        href={isLogin ? "/login" : "/login?mode=login"}
        className="mt-6 text-sm text-stone-600 underline underline-offset-4"
      >
        {isLogin ? "Need to create a profile?" : "Already have a profile? Log in"}
      </a>
    </main>
  );
}
