(function () {
  if (!window.supabase) {
    throw new Error(
      "Supabase JS belum dimuat. Pastikan CDN Supabase dimuat lebih dahulu."
    );
  }

  if (
    !window.TOKOKASIR_SUPABASE_URL ||
    !window.TOKOKASIR_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error(
      "Konfigurasi Supabase TokoKasir belum tersedia."
    );
  }

  window.tokoKasirSupabase =
    window.supabase.createClient(
      window.TOKOKASIR_SUPABASE_URL,
      window.TOKOKASIR_SUPABASE_PUBLISHABLE_KEY
    );

  console.log("✅ Supabase TokoKasir siap");
})();
