import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { prisma } from "@/lib/db";

type ResponseData = { success: true } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res
      .status(400)
      .json({ error: "email, password, and username are required" });
  }

  // Step 1: Create the auth user in Supabase. Supabase handles password
  // hashing — we never store or see the raw password.
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification during development
    });

  if (authError) {
    return res.status(400).json({ error: authError.message });
  }

  // Step 2: Create our User row in the database, linked to the Supabase
  // auth user by the same ID so we can look up profile data from auth state.
  try {
    await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        username,
      },
    });
  } catch (err: unknown) {
    // Clean up the auth user if the database write fails so we don't end up
    // with a Supabase auth user that has no corresponding profile row.
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

    const prismaError = err as { code?: string };
    if (prismaError.code === "P2002") {
      return res.status(400).json({ error: "Username or email already taken" });
    }
    return res.status(500).json({ error: "Failed to create user profile" });
  }

  return res.status(201).json({ success: true });
}
