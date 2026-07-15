(function () {

  const PLAN_LEVEL = {
    free: 0,
    pro: 1,
    business: 2
  };

  function normalizePlan(plan) {
    const value =
      String(plan || "free")
        .toLowerCase();

    return PLAN_LEVEL[value] !== undefined
      ? value
      : "free";
  }

  async function getAccountPlan() {

    if (!window.tokoKasirSupabase) {
      throw new Error(
        "Supabase TokoKasir belum tersedia."
      );
    }

    const db =
      window.tokoKasirSupabase;

    const {
      data: { session },
      error: sessionError
    } =
      await db.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      return {
        loggedIn: false,
        plan: "free",
        profile: null
      };
    }

    const {
      data: profile,
      error
    } =
      await db
        .from("profiles")
        .select(
          "plan, subscription_status, subscription_expires_at"
        )
        .eq(
          "id",
          session.user.id
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    let plan =
      normalizePlan(
        profile?.plan
      );

    const status =
      profile?.subscription_status ||
      "active";

    const expiresAt =
      profile?.subscription_expires_at;

    if (
      status !== "active"
    ) {
      plan = "free";
    }

    if (
      expiresAt &&
      new Date(expiresAt).getTime() <
      Date.now()
    ) {
      plan = "free";
    }

    return {
      loggedIn: true,
      plan,
      profile
    };
  }

  async function canAccess(
    requiredPlan
  ) {

    const account =
      await getAccountPlan();

    const currentLevel =
      PLAN_LEVEL[
        normalizePlan(
          account.plan
        )
      ];

    const requiredLevel =
      PLAN_LEVEL[
        normalizePlan(
          requiredPlan
        )
      ];

    return {
      ...account,
      allowed:
        currentLevel >=
        requiredLevel
    };
  }

  async function requirePlan(
    requiredPlan
  ) {

    try {

      const access =
        await canAccess(
          requiredPlan
        );

      if (!access.loggedIn) {

        location.replace(
          "/TokoKasir/account/"
        );

        return false;
      }

      if (!access.allowed) {

        const target =
          requiredPlan === "business"
            ? "business"
            : "pro";

        location.replace(
          "/TokoKasir/account/?upgrade=" +
          encodeURIComponent(target)
        );

        return false;
      }

      return true;

    } catch (error) {

      console.error(
        "TokoKasir plan guard:",
        error
      );

      location.replace(
        "/TokoKasir/account/"
      );

      return false;
    }
  }

  window.TokoKasirPlanGuard = {
    getAccountPlan,
    canAccess,
    requirePlan
  };

})();
