(function () {
  const rank = {
    free: 0,
    pro: 1,
    business: 2
  };

  function currentPlan() {
    return window.TOKOKASIR_PLAN || "free";
  }

  function canUse(requiredPlan) {
    return rank[currentPlan()] >= rank[requiredPlan];
  }

  function requirePlan(requiredPlan, featureName = "Fitur ini") {
    if (canUse(requiredPlan)) {
      return true;
    }

    const label =
      requiredPlan === "business"
        ? "Business"
        : "Pro";

    const upgrade = confirm(
      `${featureName} memerlukan paket ${label}.\n\nUpgrade sekarang?`
    );

    if (upgrade) {
      window.location.href = "../account/";
    }

    return false;
  }

  window.TokoKasirSubscription = {
    currentPlan,
    canUse,
    requirePlan
  };
})();

/* ==========================================
   PACKAGE ACCESS UI
========================================== */

window.addEventListener(
  "tokokasir:authenticated",
  function (event) {

    const user = event.detail;
    const plan = user.plan || "free";

    const rank = {
      free: 0,
      pro: 1,
      business: 2
    };

    /* Update badge paket */
    const badge =
      document.getElementById("planBadge");

    if (badge) {
      badge.textContent =
        plan.toUpperCase();
    }

    /* Update informasi paket di settings */
    document
      .querySelectorAll(".info-row")
      .forEach(row => {

        const label =
          row.querySelector("span");

        const value =
          row.querySelector("b");

        if (
          label &&
          value &&
          label.textContent.trim() === "Paket"
        ) {
          value.textContent =
            plan.toUpperCase();
        }

      });

    /* Kunci menu berdasarkan paket */
    document
      .querySelectorAll(
        "[data-required-plan]"
      )
      .forEach(button => {

        const required =
          button.dataset.requiredPlan;

        if (
          rank[plan] <
          rank[required]
        ) {

          button.classList.add(
            "premium-locked"
          );

          if (
            !button.querySelector(
              ".lock-label"
            )
          ) {

            const lock =
              document.createElement(
                "span"
              );

            lock.className =
              "lock-label";

            lock.textContent =
              required === "business"
                ? "BUSINESS"
                : "PRO";

            button.appendChild(lock);

          }

        } else {

          button.classList.remove(
            "premium-locked"
          );

        }

      });

    /* Tampilkan nama user backend */
    const welcome =
      document.getElementById(
        "welcomeName"
      );

    if (welcome) {
      welcome.textContent =
        "Halo, " +
        user.name +
        " 👋";
    }

  }
);


/* ==========================================
   BLOCK LOCKED NAVIGATION
========================================== */

document.addEventListener(
  "click",
  function (event) {

    const button =
      event.target.closest(
        "[data-required-plan]"
      );

    if (!button) {
      return;
    }

    const required =
      button.dataset.requiredPlan;

    if (
      !window.TokoKasirSubscription
        .canUse(required)
    ) {

      event.preventDefault();
      event.stopImmediatePropagation();

      const feature =
        button.textContent
          .replace(
            "PRO",
            ""
          )
          .replace(
            "BUSINESS",
            ""
          )
          .trim();

      window.TokoKasirSubscription
        .requirePlan(
          required,
          feature
        );

    }

  },
  true
);
