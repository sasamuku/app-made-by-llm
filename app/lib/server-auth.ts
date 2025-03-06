import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "./prisma";
import type { User } from "@supabase/supabase-js";

export async function getServerUser() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function syncUserWithDatabase(user: User) {
  if (!user) return null;

  try {
    // ユーザーがデータベースに存在するか確認し、存在しなければ作成
    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email || "",
      },
      create: {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || user.email?.split("@")[0] || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
      },
    });

    return dbUser;
  } catch (error) {
    console.error("Error syncing user with database:", error);
    return null;
  }
}

export async function getCurrentUser() {
  const user = await getServerUser();
  if (!user) return null;

  return await syncUserWithDatabase(user);
}
