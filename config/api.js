(function () {
  const isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  /*
   * LOCAL:
   * http://localhost:3000
   *
   * PRODUCTION:
   * Ganti URL di bawah setelah backend online.
   */

  window.TOKOKASIR_API_URL = isLocal
    ? "http://localhost:3000"
    : "https://GANTI-DENGAN-BACKEND-PUBLIK.koyeb.app";
})();
