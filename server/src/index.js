require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET belum tersedia di .env");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

/* ==========================================
   DATABASE
========================================== */

const db = new Database("./data/tokokasir.db");

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  plan TEXT NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  subscription_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

/* ==========================================
   HELPERS
========================================== */

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    subscriptionStatus: user.subscription_status,
    subscriptionExpiresAt: user.subscription_expires_at
  };
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

/* ==========================================
   AUTH MIDDLEWARE
========================================== */

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Silakan login terlebih dahulu."
    });
  }

  try {
    req.user = jwt.verify(
      header.substring(7),
      JWT_SECRET
    );

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Sesi tidak valid atau sudah berakhir."
    });
  }
}

function adminOnly(req, res, next) {
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(req.user.id);

  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Akses admin diperlukan."
    });
  }

  next();
}

/* ==========================================
   SUBSCRIPTION CHECK
========================================== */

function refreshSubscription(userId) {
  let user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId);

  if (
    user &&
    user.plan !== "free" &&
    user.subscription_expires_at &&
    new Date(user.subscription_expires_at) <= new Date()
  ) {
    db.prepare(`
      UPDATE users
      SET
        plan = 'free',
        subscription_status = 'expired',
        subscription_expires_at = NULL
      WHERE id = ?
    `).run(userId);

    user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId);
  }

  return user;
}

function requirePlan(...allowedPlans) {
  return (req, res, next) => {
    const user = refreshSubscription(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan."
      });
    }

    if (!allowedPlans.includes(user.plan)) {
      return res.status(403).json({
        success: false,
        message: "Upgrade paket untuk menggunakan fitur ini.",
        currentPlan: user.plan,
        allowedPlans
      });
    }

    req.currentUser = user;

    next();
  };
}

/* ==========================================
   HEALTH
========================================== */

app.get("/", (req, res) => {
  res.json({
    app: "TokoKasir API",
    status: "running",
    version: "1.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend TokoKasir aktif"
  });
});

/* ==========================================
   REGISTER
========================================== */

app.post("/api/auth/register", async (req, res) => {
  try {
    let { name, email, password } = req.body;

    name = (name || "").trim();
    email = (email || "").trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password wajib diisi."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter."
      });
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar."
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const role =
      email === ADMIN_EMAIL
        ? "admin"
        : "user";

    const result = db.prepare(`
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        plan,
        subscription_status
      )
      VALUES (?, ?, ?, ?, 'free', 'active')
    `).run(
      name,
      email,
      passwordHash,
      role
    );

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil. Paket Gratis aktif.",
      token: createToken(user),
      user: publicUser(user)
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server."
    });
  }
});

/* ==========================================
   LOGIN
========================================== */

app.post("/api/auth/login", async (req, res) => {
  try {
    const email =
      (req.body.email || "")
        .trim()
        .toLowerCase();

    const password =
      req.body.password || "";

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah."
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah."
      });
    }

    const currentUser =
      refreshSubscription(user.id);

    res.json({
      success: true,
      message: "Login berhasil.",
      token: createToken(currentUser),
      user: publicUser(currentUser)
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server."
    });
  }
});

/* ==========================================
   CURRENT USER
========================================== */

app.get("/api/me", auth, (req, res) => {
  const user =
    refreshSubscription(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Pengguna tidak ditemukan."
    });
  }

  res.json({
    success: true,
    user: publicUser(user)
  });
});

/* ==========================================
   CREATE PAYMENT
========================================== */

app.post(
  "/api/subscriptions/checkout",
  auth,
  (req, res) => {

    const plan =
      (req.body.plan || "")
        .toLowerCase();

    const plans = {
      pro: {
        amount: 99000,
        label: "Pro"
      },

      business: {
        amount: 299000,
        label: "Business"
      }
    };

    if (!plans[plan]) {
      return res.status(400).json({
        success: false,
        message: "Paket tidak valid."
      });
    }

    const selected = plans[plan];

    // Cek apakah user sudah memiliki tagihan pending
    // untuk paket yang sama.
    const existingPayment = db.prepare(`
      SELECT *
      FROM payments
      WHERE
        user_id = ?
        AND plan = ?
        AND status = 'pending'
      ORDER BY id DESC
      LIMIT 1
    `).get(
      req.user.id,
      plan
    );

    if (existingPayment) {
      return res.json({
        success: true,
        message: "Tagihan pending yang sudah ada digunakan kembali.",
        payment: {
          id: existingPayment.id,
          plan: existingPayment.plan,
          planLabel: selected.label,
          amount: existingPayment.amount,
          status: existingPayment.status
        },
        existing: true
      });
    }

    const result = db.prepare(`
      INSERT INTO payments (
        user_id,
        plan,
        amount,
        status
      )
      VALUES (?, ?, ?, 'pending')
    `).run(
      req.user.id,
      plan,
      selected.amount
    );

    res.status(201).json({
      success: true,
      message: "Tagihan berhasil dibuat.",
      payment: {
        id: result.lastInsertRowid,
        plan,
        planLabel: selected.label,
        amount: selected.amount,
        status: "pending"
      },

      paymentInstructions: {
        bank: "Mandiri",
        accountName: "Alma",
        accountNumber: "1670003828281"
      }
    });
  }
);

/* ==========================================
   USER PAYMENTS
========================================== */

app.get(
  "/api/payments/my",
  auth,
  (req, res) => {

    const payments = db.prepare(`
      SELECT
        id,
        plan,
        amount,
        status,
        created_at,
        verified_at
      FROM payments
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.user.id);

    res.json({
      success: true,
      payments
    });
  }
);

/* ==========================================
   ADMIN - PAYMENT LIST
========================================== */

app.get(
  "/api/admin/payments",
  auth,
  adminOnly,
  (req, res) => {

    const payments = db.prepare(`
      SELECT
        payments.id,
        payments.plan,
        payments.amount,
        payments.status,
        payments.created_at,
        payments.verified_at,
        users.id AS user_id,
        users.name,
        users.email
      FROM payments
      INNER JOIN users
        ON users.id = payments.user_id
      ORDER BY payments.id DESC
    `).all();

    res.json({
      success: true,
      payments
    });
  }
);

/* ==========================================
   ADMIN - APPROVE PAYMENT
========================================== */

app.post(
  "/api/admin/payments/:id/approve",
  auth,
  adminOnly,
  (req, res) => {

    const payment = db
      .prepare(`
        SELECT *
        FROM payments
        WHERE id = ?
      `)
      .get(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Pembayaran tidak ditemukan."
      });
    }

    if (payment.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Pembayaran sudah disetujui."
      });
    }

    const currentUser = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(payment.user_id);

    let startDate = new Date();

    if (
      currentUser.subscription_expires_at &&
      new Date(currentUser.subscription_expires_at) > startDate &&
      currentUser.plan === payment.plan
    ) {
      startDate =
        new Date(
          currentUser.subscription_expires_at
        );
    }

    const expiresAt =
      new Date(startDate);

    expiresAt.setDate(
      expiresAt.getDate() + 30
    );

    const approve = db.transaction(() => {

      db.prepare(`
        UPDATE payments
        SET
          status = 'approved',
          verified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(payment.id);

      db.prepare(`
        UPDATE users
        SET
          plan = ?,
          subscription_status = 'active',
          subscription_expires_at = ?
        WHERE id = ?
      `).run(
        payment.plan,
        expiresAt.toISOString(),
        payment.user_id
      );

    });

    approve();

    res.json({
      success: true,
      message:
        `Paket ${payment.plan} berhasil diaktifkan selama 30 hari.`,
      plan: payment.plan,
      expiresAt:
        expiresAt.toISOString()
    });
  }
);

/* ==========================================
   ADMIN - REJECT PAYMENT
========================================== */

app.post(
  "/api/admin/payments/:id/reject",
  auth,
  adminOnly,
  (req, res) => {

    const payment = db
      .prepare(`
        SELECT *
        FROM payments
        WHERE id = ?
      `)
      .get(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Pembayaran tidak ditemukan."
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Hanya pembayaran pending yang dapat ditolak."
      });
    }

    db.prepare(`
      UPDATE payments
      SET status = 'rejected'
      WHERE id = ?
    `).run(payment.id);

    res.json({
      success: true,
      message: "Pembayaran berhasil ditolak."
    });
  }
);

/* ==========================================
   PREMIUM FEATURES TEST
========================================== */

app.get(
  "/api/features/pro",
  auth,
  requirePlan("pro", "business"),
  (req, res) => {

    res.json({
      success: true,
      message:
        "Fitur Pro berhasil dibuka.",
      plan:
        req.currentUser.plan
    });
  }
);

app.get(
  "/api/features/business",
  auth,
  requirePlan("business"),
  (req, res) => {

    res.json({
      success: true,
      message:
        "Fitur Business berhasil dibuka.",
      plan:
        req.currentUser.plan
    });
  }
);

/* ==========================================
   404
========================================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan."
  });
});

/* ==========================================
   SERVER
========================================== */

app.listen(PORT, () => {
  console.log(
    `✅ TokoKasir API berjalan di http://localhost:${PORT}`
  );
});
