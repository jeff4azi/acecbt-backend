/**
 * scripts/create-admins.js
 *
 * Creates the two main admin accounts in Supabase Auth and inserts
 * their profiles with is_admin = true.
 *
 * Usage:
 *   node scripts/create-admins.js
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in
 *     acecbt-backend/.env (already present).
 *   - Run from the acecbt-backend directory:
 *       cd acecbt-backend
 *       node scripts/create-admins.js
 *
 * The script is IDEMPOTENT — running it more than once is safe.
 * If an account already exists it will update the profile row to
 * ensure is_admin = true rather than erroring out.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Admin accounts to create ─────────────────────────────────────────────────
// Change the passwords here before running if you want different defaults.
// Passwords can be changed any time via the Supabase dashboard or Auth API.
const ADMINS = [
  {
    email: "admin@aceeduc.com",
    password: "AceAdmin2024!",
    full_name: "Ace Admin",
  },
  {
    email: "adebowale@aceeduc.com",
    password: "AceAdmin2024!",
    full_name: "Adebowale",
  },
];

async function upsertAdmin({ email, password, full_name }) {
  console.log(`\n→ Processing ${email}…`);

  // 1. Try to create the auth user
  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm so they can log in immediately
    });

  let userId;

  if (createError) {
    if (
      createError.message.toLowerCase().includes("already been registered") ||
      createError.message.toLowerCase().includes("already exists")
    ) {
      // User exists — look up their id
      console.log(`  ℹ  Auth user already exists, fetching existing id…`);
      const { data: listData, error: listError } =
        await supabase.auth.admin.listUsers();

      if (listError) {
        console.error(`  ❌  Could not list users: ${listError.message}`);
        return;
      }

      const existing = listData.users.find((u) => u.email === email);
      if (!existing) {
        console.error(`  ❌  Could not find existing user for ${email}`);
        return;
      }
      userId = existing.id;
    } else {
      console.error(`  ❌  Failed to create auth user: ${createError.message}`);
      return;
    }
  } else {
    userId = createData.user.id;
    console.log(`  ✅  Auth user created — id: ${userId}`);
  }

  // 2. Upsert profile row with is_admin = true
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, full_name, email, is_admin: true },
      { onConflict: "id" },
    );

  if (profileError) {
    console.error(`  ❌  Failed to upsert profile: ${profileError.message}`);
    return;
  }

  console.log(`  ✅  Profile upserted with is_admin = true`);
  console.log(`  📧  Email   : ${email}`);
  console.log(`  🔑  Password: ${password}  ← change this after first login`);
}

async function main() {
  console.log("🚀  Ace Edu CBT — Admin Account Setup");
  console.log("─".repeat(45));

  for (const admin of ADMINS) {
    await upsertAdmin(admin);
  }

  console.log("\n─".repeat(45));
  console.log("✅  Done. Both admin accounts are ready.\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
