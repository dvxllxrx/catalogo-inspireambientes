import { supabase } from "./supabase";

export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return {
    user,
    role: data.role,
  };
}