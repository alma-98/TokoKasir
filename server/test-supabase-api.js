require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

async function main() {
  console.log("=== TOKOKASIR SUPABASE TEST ===");

  console.log(
    "SUPABASE_URL:",
    process.env.SUPABASE_URL ? "✅ tersedia" : "❌ belum ada"
  );

  console.log(
    "SERVICE_ROLE_KEY:",
    process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ tersedia" : "❌ belum ada"
  );

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    console.log("🔄 Mengecek tabel users...");

    const usersResult = await supabase
      .from("users")
      .select("id", {
        count: "exact",
        head: true
      });

    if (usersResult.error) {
      console.error("❌ ERROR USERS:");
      console.dir(usersResult.error, { depth: null });
      process.exit(1);
    }

    console.log("🔄 Mengecek tabel payments...");

    const paymentsResult = await supabase
      .from("payments")
      .select("id", {
        count: "exact",
        head: true
      });

    if (paymentsResult.error) {
      console.error("❌ ERROR PAYMENTS:");
      console.dir(paymentsResult.error, { depth: null });
      process.exit(1);
    }

    console.log("");
    console.log("=================================");
    console.log("✅ SUPABASE TOKOKASIR TERHUBUNG");
    console.log("Users:", usersResult.count ?? 0);
    console.log("Payments:", paymentsResult.count ?? 0);
    console.log("=================================");

  } catch (error) {
    console.error("❌ CONNECTION ERROR:");
    console.dir(error, { depth: null });
    process.exit(1);
  }
}

main();
