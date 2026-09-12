import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user?.id) {
    redirect("/login");
  }

  return user;
}
