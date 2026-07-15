require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const supabase = require("./supabase");

const app = express();

const PORT =
  process.env.PORT || 3000;

const JWT_SECRET =
  process.env.JWT_SECRET;

const ADMIN_EMAIL =
  (
    process.env.ADMIN_EMAIL ||
    "alma.budsteddy88@gmail.com"
  ).toLowerCase();


if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET belum tersedia di .env"
  );
}


app.use(cors({
  origin: true,
  credentials: false
}));

app.use(express.json({
  limit: "2mb"
}));


const PLANS = {
  pro: {
    label: "Pro",
    amount: 99000
  },

  business: {
    label: "Business",
    amount: 299000
  }
};


// ==================================================
// HELPERS
// ==================================================

function signToken(user) {

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


function publicUser(user) {

  return {
    id: user.id,

    name: user.name,

    email: user.email,

    role: user.role,

    plan: user.plan,

    subscriptionStatus:
      user.subscription_status,

    subscriptionExpiresAt:
      user.subscription_expires_at
  };

}


async function getUserById(id) {

  const {
    data,
    error
  } =
    await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();


  if (error) {
    throw error;
  }


  return data;
}


async function auth(
  req,
  res,
  next
) {

  try {

    const header =
      req.headers.authorization || "";


    if (
      !header.startsWith("Bearer ")
    ) {

      return res.status(401).json({
        success: false,
        message:
          "Token autentikasi diperlukan."
      });

    }


    const token =
      header.slice(7);


    const payload =
      jwt.verify(
        token,
        JWT_SECRET
      );


    const user =
      await getUserById(
        payload.id
      );


    if (!user) {

      return res.status(401).json({
        success: false,
        message:
          "Akun tidak ditemukan."
      });

    }


    req.user = user;

    next();


  } catch (error) {

    return res.status(401).json({
      success: false,
      message:
        "Sesi login tidak valid atau sudah berakhir."
    });

  }

}


function adminOnly(
  req,
  res,
  next
) {

  if (
    req.user.role !== "admin"
  ) {

    return res.status(403).json({
      success: false,
      message:
        "Akses administrator diperlukan."
    });

  }


  next();
}


// ==================================================
// HEALTH
// ==================================================

app.get(
  "/",
  (req, res) => {

    res.json({
      app: "TokoKasir API",
      status: "running",
      database: "Supabase",
      version: "2.0.0"
    });

  }
);


app.get(
  "/api/health",
  async (req, res) => {

    try {

      const {
        error
      } =
        await supabase
          .from("users")
          .select(
            "id",
            {
              count: "exact",
              head: true
            }
          );


      if (error) {
        throw error;
      }


      res.json({
        success: true,
        message:
          "Backend TokoKasir aktif",
        database:
          "Supabase connected"
      });


    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          "Supabase tidak dapat diakses."
      });

    }

  }
);


// ==================================================
// REGISTER
// ==================================================

app.post(
  "/api/auth/register",
  async (req, res) => {

    try {

      const name =
        String(
          req.body.name || ""
        ).trim();


      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();


      const password =
        String(
          req.body.password || ""
        );


      if (
        !name ||
        !email ||
        password.length < 6
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Nama, email, dan password minimal 6 karakter wajib diisi."
        });

      }


      const {
        data: existing,
        error: existingError
      } =
        await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();


      if (existingError) {
        throw existingError;
      }


      if (existing) {

        return res.status(409).json({
          success: false,
          message:
            "Email sudah terdaftar."
        });

      }


      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      const role =
        email === ADMIN_EMAIL
          ? "admin"
          : "user";


      const {
        data: user,
        error
      } =
        await supabase
          .from("users")
          .insert({
            name,
            email,

            password_hash:
              passwordHash,

            role,

            plan: "free",

            subscription_status:
              "active"
          })
          .select()
          .single();


      if (error) {
        throw error;
      }


      const token =
        signToken(user);


      res.status(201).json({
        success: true,

        message:
          "Registrasi berhasil. Paket Gratis aktif.",

        token,

        user:
          publicUser(user)
      });


    } catch (error) {

      console.error(
        "REGISTER:",
        error
      );


      res.status(500).json({
        success: false,
        message:
          "Registrasi gagal."
      });

    }

  }
);


// ==================================================
// LOGIN
// ==================================================

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();


      const password =
        String(
          req.body.password || ""
        );


      const {
        data: user,
        error
      } =
        await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .maybeSingle();


      if (error) {
        throw error;
      }


      if (!user) {

        return res.status(401).json({
          success: false,
          message:
            "Email atau password salah."
        });

      }


      const valid =
        await bcrypt.compare(
          password,
          user.password_hash
        );


      if (!valid) {

        return res.status(401).json({
          success: false,
          message:
            "Email atau password salah."
        });

      }


      const token =
        signToken(user);


      res.json({
        success: true,

        message:
          "Login berhasil.",

        token,

        user:
          publicUser(user)
      });


    } catch (error) {

      console.error(
        "LOGIN:",
        error
      );


      res.status(500).json({
        success: false,
        message:
          "Login gagal."
      });

    }

  }
);


// ==================================================
// CURRENT USER
// ==================================================

app.get(
  "/api/me",
  auth,
  async (req, res) => {

    res.json({
      success: true,
      user:
        publicUser(req.user)
    });

  }
);


// ==================================================
// CREATE PAYMENT
// ==================================================

app.post(
  "/api/payments",
  auth,
  async (req, res) => {

    try {

      const plan =
        String(
          req.body.plan || ""
        ).toLowerCase();


      const selected =
        PLANS[plan];


      if (!selected) {

        return res.status(400).json({
          success: false,
          message:
            "Paket tidak valid."
        });

      }


      // Jika user sudah memiliki paket tersebut
      // dan masih aktif, jangan buat tagihan baru.

      if (
        req.user.plan === plan &&
        req.user.subscription_status ===
          "active" &&
        req.user.subscription_expires_at &&
        new Date(
          req.user.subscription_expires_at
        ) > new Date()
      ) {

        return res.status(400).json({
          success: false,
          message:
            `Paket ${selected.label} masih aktif.`
        });

      }


      // Cari pending payment paket yang sama.

      const {
        data: existingPayments,
        error: existingError
      } =
        await supabase
          .from("payments")
          .select("*")
          .eq(
            "user_id",
            req.user.id
          )
          .eq(
            "plan",
            plan
          )
          .eq(
            "status",
            "pending"
          )
          .order(
            "id",
            {
              ascending: false
            }
          )
          .limit(1);


      if (existingError) {
        throw existingError;
      }


      if (
        existingPayments &&
        existingPayments.length
      ) {

        const payment =
          existingPayments[0];


        return res.json({
          success: true,

          existing: true,

          message:
            "Tagihan pending yang sudah ada digunakan kembali.",

          payment
        });

      }


      const {
        data: payment,
        error
      } =
        await supabase
          .from("payments")
          .insert({

            user_id:
              req.user.id,

            plan,

            amount:
              selected.amount,

            status:
              "pending",

            payment_method:
              "qris"

          })
          .select()
          .single();


      if (error) {
        throw error;
      }


      res.status(201).json({
        success: true,

        message:
          "Tagihan QRIS berhasil dibuat.",

        payment
      });


    } catch (error) {

      console.error(
        "CREATE PAYMENT:",
        error
      );


      res.status(500).json({
        success: false,
        message:
          "Gagal membuat tagihan."
      });

    }

  }
);


// Compatibility endpoint
app.post(
  "/api/payments/create",
  auth,
  async (req, res) => {

    try {

      const plan =
        String(
          req.body.plan || ""
        ).toLowerCase();


      const selected =
        PLANS[plan];


      if (!selected) {

        return res.status(400).json({
          success: false,
          message:
            "Paket tidak valid."
        });

      }


      const {
        data: existing
      } =
        await supabase
          .from("payments")
          .select("*")
          .eq(
            "user_id",
            req.user.id
          )
          .eq(
            "plan",
            plan
          )
          .eq(
            "status",
            "pending"
          )
          .order(
            "id",
            {
              ascending: false
            }
          )
          .limit(1);


      if (
        existing &&
        existing.length
      ) {

        return res.json({
          success: true,
          existing: true,
          payment:
            existing[0]
        });

      }


      const {
        data: payment,
        error
      } =
        await supabase
          .from("payments")
          .insert({
            user_id:
              req.user.id,

            plan,

            amount:
              selected.amount,

            status:
              "pending",

            payment_method:
              "qris"
          })
          .select()
          .single();


      if (error) {
        throw error;
      }


      res.status(201).json({
        success: true,
        payment
      });


    } catch (error) {

      console.error(error);


      res.status(500).json({
        success: false,
        message:
          "Gagal membuat pembayaran."
      });

    }

  }
);


// ==================================================
// USER PAYMENTS
// ==================================================

app.get(
  "/api/payments/my",
  auth,
  async (req, res) => {

    try {

      const {
        data,
        error
      } =
        await supabase
          .from("payments")
          .select("*")
          .eq(
            "user_id",
            req.user.id
          )
          .order(
            "id",
            {
              ascending: false
            }
          );


      if (error) {
        throw error;
      }


      res.json({
        success: true,
        payments:
          data || []
      });


    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          "Gagal mengambil pembayaran."
      });

    }

  }
);


// ==================================================
// ADMIN PAYMENTS
// ==================================================

app.get(
  "/api/admin/payments",
  auth,
  adminOnly,
  async (req, res) => {

    try {

      const {
        data,
        error
      } =
        await supabase
          .from("payments")
          .select(`
            id,
            plan,
            amount,
            status,
            payment_method,
            created_at,
            verified_at,
            user_id,
            users (
              name,
              email
            )
          `)
          .order(
            "id",
            {
              ascending: false
            }
          );


      if (error) {
        throw error;
      }


      const payments =
        (data || []).map(
          payment => ({
            ...payment,

            name:
              payment.users?.name ||
              "-",

            email:
              payment.users?.email ||
              "-"
          })
        );


      res.json({
        success: true,
        payments
      });


    } catch (error) {

      console.error(
        "ADMIN PAYMENTS:",
        error
      );


      res.status(500).json({
        success: false,
        message:
          "Gagal mengambil data pembayaran."
      });

    }

  }
);


// ==================================================
// ADMIN APPROVE
// ==================================================

async function approvePayment(
  req,
  res
) {

  try {

    const paymentId =
      req.params.id;


    const {
      data: payment,
      error
    } =
      await supabase
        .from("payments")
        .select("*")
        .eq(
          "id",
          paymentId
        )
        .maybeSingle();


    if (error) {
      throw error;
    }


    if (!payment) {

      return res.status(404).json({
        success: false,
        message:
          "Pembayaran tidak ditemukan."
      });

    }


    if (
      payment.status ===
      "approved"
    ) {

      return res.json({
        success: true,
        message:
          "Pembayaran sudah pernah diaktifkan."
      });

    }


    if (
      payment.status !==
      "pending"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Pembayaran tidak dapat diaktifkan."
      });

    }


    const now =
      new Date();


    const expiresAt =
      new Date(
        now.getTime() +
        30 *
        24 *
        60 *
        60 *
        1000
      );


    const {
      error: userError
    } =
      await supabase
        .from("users")
        .update({

          plan:
            payment.plan,

          subscription_status:
            "active",

          subscription_expires_at:
            expiresAt.toISOString()

        })
        .eq(
          "id",
          payment.user_id
        );


    if (userError) {
      throw userError;
    }


    const {
      error: paymentError
    } =
      await supabase
        .from("payments")
        .update({

          status:
            "approved",

          verified_at:
            now.toISOString()

        })
        .eq(
          "id",
          payment.id
        );


    if (paymentError) {
      throw paymentError;
    }


    res.json({
      success: true,

      message:
        `Paket ${payment.plan} berhasil diaktifkan selama 30 hari.`,

      plan:
        payment.plan,

      expiresAt:
        expiresAt.toISOString()
    });


  } catch (error) {

    console.error(
      "APPROVE:",
      error
    );


    res.status(500).json({
      success: false,
      message:
        "Gagal mengaktifkan pembayaran."
    });

  }

}


app.post(
  "/api/admin/payments/:id/approve",
  auth,
  adminOnly,
  approvePayment
);


// Compatibility endpoint
app.post(
  "/api/admin/payments/:id/verify",
  auth,
  adminOnly,
  approvePayment
);


// ==================================================
// ADMIN REJECT
// ==================================================

app.post(
  "/api/admin/payments/:id/reject",
  auth,
  adminOnly,
  async (req, res) => {

    try {

      const {
        data: payment,
        error
      } =
        await supabase
          .from("payments")
          .select("*")
          .eq(
            "id",
            req.params.id
          )
          .maybeSingle();


      if (error) {
        throw error;
      }


      if (!payment) {

        return res.status(404).json({
          success: false,
          message:
            "Pembayaran tidak ditemukan."
        });

      }


      if (
        payment.status !==
        "pending"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Hanya pembayaran pending yang dapat ditolak."
        });

      }


      const {
        error: updateError
      } =
        await supabase
          .from("payments")
          .update({
            status:
              "rejected",

            verified_at:
              new Date()
                .toISOString()
          })
          .eq(
            "id",
            payment.id
          );


      if (updateError) {
        throw updateError;
      }


      res.json({
        success: true,
        message:
          "Pembayaran berhasil ditolak."
      });


    } catch (error) {

      console.error(
        "REJECT:",
        error
      );


      res.status(500).json({
        success: false,
        message:
          "Gagal menolak pembayaran."
      });

    }

  }
);


// ==================================================
// START
// ==================================================

app.listen(
  PORT,
  () => {

    console.log("");
    console.log(
      "======================================"
    );

    console.log(
      `✅ TokoKasir API berjalan di http://localhost:${PORT}`
    );

    console.log(
      "✅ Database: Supabase"
    );

    console.log(
      "✅ Payment: QRIS + Admin Verification"
    );

    console.log(
      "======================================"
    );

    console.log("");

  }
);
