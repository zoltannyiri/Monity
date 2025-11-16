require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

// middlewares
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// egyelőre: fix demo user
const DEMO_USER_EMAIL = "demo@monity.local";

// létrehoz / visszaad egy demo usert, és az id-ját
async function getDemoUserId() {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        passwordHash: "demo", // később bcrypt
      },
    });
  }

  return user.id;
}

// REGISZTRÁCIÓ
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Adj meg egy email címet és legalább 6 karakteres jelszót.' });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({ error: 'Ezzel az email címmel már létezik fiók.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const token = signToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ error: 'Nem sikerült regisztrálni.' });
  }
});


// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Adj meg email címet és jelszót.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Hibás email vagy jelszó.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Hibás email vagy jelszó.' });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Nem sikerült bejelentkezni.' });
  }
});



// Authenticated user info
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Felhasználó nem található.' });
    }

    res.json(user);
  } catch (err) {
    console.error('Me error', err);
    res.status(500).json({ error: 'Nem sikerült lekérdezni a profilt.' });
  }
});



// GET /api/subscriptions
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const items = await prisma.subscription.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch subscriptions' });
  }
});

// POST /api/subscriptions
app.post('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      price,
      currency = 'HUF',
      billingCycle = 'monthly',
      nextChargeDate,
      category,
      notes,
    } = req.body;

    const created = await prisma.subscription.create({
      data: {
        userId: req.userId,
        name,
        price: Number(price),
        currency,
        billingCycle,
        nextChargeDate: nextChargeDate ? new Date(nextChargeDate) : null,
        category,
        notes,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create subscription' });
  }
});

// PUT /api/subscriptions/:id
app.put('/api/subscriptions/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const {
      name,
      price,
      currency,
      billingCycle,
      nextChargeDate,
      category,
      notes,
    } = req.body;

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        name,
        price: Number(price),
        currency,
        billingCycle,
        nextChargeDate: nextChargeDate ? new Date(nextChargeDate) : null,
        category,
        notes,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update subscription' });
  }
});

// DELETE /api/subscriptions/:id
app.delete('/api/subscriptions/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  try {
    await prisma.subscription.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete subscription' });
  }
});




// JWT generálás
function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// Auth middleware: Bearer tokenből userId
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Hiányzó token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    console.error("JWT error", err);
    return res.status(401).json({ error: "Érvénytelen vagy lejárt token" });
  }
}

// GET /api/subscriptions
app.get("/api/subscriptions", async (req, res) => {
  try {
    const userId = await getDemoUserId();
    const items = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch subscriptions" });
  }
});

// POST /api/subscriptions
app.post("/api/subscriptions", async (req, res) => {
  try {
    const userId = await getDemoUserId();

    const {
      name,
      price,
      currency = "HUF",
      billingCycle = "monthly",
      nextChargeDate,
      category,
      notes,
    } = req.body;

    const created = await prisma.subscription.create({
      data: {
        userId,
        name,
        price: Number(price),
        currency,
        billingCycle,
        nextChargeDate: nextChargeDate ? new Date(nextChargeDate) : null,
        category,
        notes,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create subscription" });
  }
});

// PUT /api/subscriptions/:id
app.put("/api/subscriptions/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const {
      name,
      price,
      currency,
      billingCycle,
      nextChargeDate,
      category,
      notes,
    } = req.body;

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        name,
        price: Number(price),
        currency,
        billingCycle,
        nextChargeDate: nextChargeDate ? new Date(nextChargeDate) : null,
        category,
        notes,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update subscription" });
  }
});

// DELETE /api/subscriptions/:id
app.delete("/api/subscriptions/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    await prisma.subscription.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete subscription" });
  }
});


// GET /api/settings - felhasználói alapbeállítások lekérése
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        defaultCurrency: true,
        defaultBillingCycle: true,
        notifyDaysBefore: true,
        lastNotificationSentAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Felhasználó nem található.' });
    }

    res.json(user);
  } catch (err) {
    console.error('Settings GET error', err);
    res.status(500).json({ error: 'Nem sikerült betölteni a beállításokat.' });
  }
});

// PUT /api/settings - beállítások mentése
app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const {
      defaultCurrency,
      defaultBillingCycle,
      notifyDaysBefore,
    } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        defaultCurrency: defaultCurrency || null,
        defaultBillingCycle: defaultBillingCycle || null,
        notifyDaysBefore:
          notifyDaysBefore !== undefined && notifyDaysBefore !== null
            ? Number(notifyDaysBefore)
            : null,
      },
      select: {
        id: true,
        email: true,
        defaultCurrency: true,
        defaultBillingCycle: true,
        notifyDaysBefore: true,
        lastNotificationSentAt: true, 
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Settings PUT error', err);
    res.status(500).json({ error: 'Nem sikerült menteni a beállításokat.' });
  }
});



// GET /api/notifications/preview
app.get('/api/notifications/preview', authMiddleware, async (req, res) => {
  try {
    // felhasználó beállításainak lekérése
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        notifyDaysBefore: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Felhasználó nem található.' });
    }

    const notifyDays =
      user.notifyDaysBefore !== null &&
      user.notifyDaysBefore !== undefined &&
      !Number.isNaN(Number(user.notifyDaysBefore))
        ? Number(user.notifyDaysBefore)
        : 7;

    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ); // ma 00:00

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + notifyDays);

    // összes subscription a userhez
    const subs = await prisma.subscription.findMany({
      where: {
        userId: req.userId,
        nextChargeDate: {
          gte: today,
          lte: endDate,
        },
      },
      orderBy: {
        nextChargeDate: 'asc',
      },
    });

    const items = subs.map((s) => {
      const chargeDate = new Date(s.nextChargeDate);
      const diffMs = chargeDate.getTime() - today.getTime();
      const daysUntilCharge = Math.round(diffMs / (1000 * 60 * 60 * 24));

      return {
        id: s.id,
        name: s.name,
        price: s.price,
        currency: s.currency,
        billingCycle: s.billingCycle,
        category: s.category,
        nextChargeDate: s.nextChargeDate,
        daysUntilCharge,
      };
    });

    const totalAmount = items.reduce((sum, it) => sum + it.price, 0);

    res.json({
      notifyDaysBefore: notifyDays,
      count: items.length,
      totalAmount,
      items,
    });
  } catch (err) {
    console.error('Notifications preview error', err);
    res
      .status(500)
      .json({ error: 'Nem sikerült lekérdezni az értesítés előnézetet.' });
  }
});



// POST /api/subscriptions/:id/bump-next-charge
app.post('/api/subscriptions/:id/bump-next-charge', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Érvénytelen azonosító.' });
    }

    const sub = await prisma.subscription.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!sub) {
      return res.status(404).json({ error: 'Előfizetés nem található.' });
    }

    if (!sub.billingCycle || !sub.nextChargeDate) {
      return res.status(400).json({
        error: 'Ehhez az előfizetéshez nincs beállítva számlázási ciklus vagy következő terhelés dátuma.',
      });
    }

    const baseDate = new Date(sub.nextChargeDate);
    const newDate = new Date(baseDate);

    if (sub.billingCycle === 'monthly') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (sub.billingCycle === 'yearly') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    } else {
      return res.status(400).json({
        error: `Ismeretlen számlázási ciklus: ${sub.billingCycle}`,
      });
    }

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        nextChargeDate: newDate,
      },
    });

    res.json({
      id: updated.id,
      nextChargeDate: updated.nextChargeDate,
    });
  } catch (err) {
    console.error('Bump next charge error', err);
    res
      .status(500)
      .json({ error: 'Nem sikerült frissíteni a következő terhelés dátumát.' });
  }
});



// email küldő
const mailTransport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

app.post('/api/notifications/send-test', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        email: true,
        notifyDaysBefore: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Felhasználó nem található.' });
    }

    const notifyDays =
      user.notifyDaysBefore !== null &&
      user.notifyDaysBefore !== undefined &&
      !Number.isNaN(Number(user.notifyDaysBefore))
        ? Number(user.notifyDaysBefore)
        : 7;

    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + notifyDays);

    const subs = await prisma.subscription.findMany({
      where: {
        userId: req.userId,
        nextChargeDate: {
          gte: today,
          lte: endDate,
        },
      },
      orderBy: { nextChargeDate: 'asc' },
    });

    if (!subs.length) {
      return res.status(400).json({
        error:
          'Jelenleg nincs olyan előfizetés, ami értesítési időablakon belül lenne.',
      });
    }

    const lines = subs.map((s) => {
      const d = s.nextChargeDate
        ? new Date(s.nextChargeDate).toLocaleDateString('hu-HU')
        : '-';
      return `• ${s.name} – ${s.price.toLocaleString('hu-HU')} ${
        s.currency
      } (${s.billingCycle === 'monthly' ? 'havi' : 'éves'}) – ${d}`;
    });

    const total = subs.reduce((sum, s) => sum + s.price, 0);

    const subject = `Monity – közelgő terhelések (${subs.length} db)`;
    const textBody =
      `Szia!\n\n` +
      `A Monity szerint a következő ${notifyDays} napban az alábbi előfizetések terhelődnek:\n\n` +
      lines.join('\n') +
      `\n\nÖsszes várható terhelés: ${total.toLocaleString('hu-HU')} Ft\n\n` +
      `Ha módosítani szeretnéd az értesítési időablakot, lépj be a Beállítások menübe.\n\n` +
      `Üdv,\n` +
      `Monity`;

    await mailTransport.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: user.email,
      subject,
      text: textBody,
    });

    //utolsó értesítés időpontja
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        lastNotificationSentAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Teszt email elküldve a(z) ${user.email} címre.`,
    });
  } catch (err) {
    console.error('Send test notifications email error', err);
    res.status(500).json({
      error:
        'Nem sikerült elküldeni a teszt emailt. Ellenőrizd az email beállításokat a szerveren.',
    });
  }
});


// ───────────────────────────────────────────────
// Napi automatikus értesítés (cron)
// ───────────────────────────────────────────────

cron.schedule('0 8 * * *', async () => {
  // ez 08:00-kor fut minden nap (szerveridő szerint)
  console.log('[CRON] Napi értesítés futtatása...');

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        notifyDaysBefore: true,
      },
    });

    for (const user of users) {
      try {
        const notifyDays =
          user.notifyDaysBefore !== null &&
          user.notifyDaysBefore !== undefined &&
          !Number.isNaN(Number(user.notifyDaysBefore))
            ? Number(user.notifyDaysBefore)
            : 7;

        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + notifyDays);

        const subs = await prisma.subscription.findMany({
          where: {
            userId: user.id,
            nextChargeDate: {
              gte: today,
              lte: endDate,
            },
          },
          orderBy: { nextChargeDate: 'asc' },
        });

        if (!subs.length) {
          continue; // ennél a usernél nincs mit küldeni
        }

        const lines = subs.map((s) => {
          const d = s.nextChargeDate
            ? new Date(s.nextChargeDate).toLocaleDateString('hu-HU')
            : '-';
          return `• ${s.name} – ${s.price.toLocaleString('hu-HU')} ${
            s.currency
          } (${s.billingCycle === 'monthly' ? 'havi' : 'éves'}) – ${d}`;
        });

        const total = subs.reduce((sum, s) => sum + s.price, 0);

        const subject = `Monity – közelgő terhelések (${subs.length} db)`;
        const textBody =
          `Szia!\n\n` +
          `A Monity szerint a következő ${notifyDays} napban az alábbi előfizetések terhelődnek:\n\n` +
          lines.join('\n') +
          `\n\nÖsszes várható terhelés: ${total.toLocaleString('hu-HU')} Ft\n\n` +
          `Ha módosítani szeretnéd az értesítési időablakot, lépj be a Beállítások menübe.\n\n` +
          `Üdv,\n` +
          `Monity`;

        await mailTransport.sendMail({
          from: process.env.MAIL_FROM || process.env.MAIL_USER,
          to: user.email,
          subject,
          text: textBody,
        });

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastNotificationSentAt: new Date(),
          },
        });

        console.log(
          `[CRON] Értesítés elküldve: ${user.email} (${subs.length} tétel)`
        );
      } catch (userErr) {
        console.error(
          `[CRON] Hiba a(z) ${user.email} értesítése közben:`,
          userErr
        );
      }
    }
  } catch (err) {
    console.error('[CRON] Globális hiba a napi értesítésben:', err);
  }
});





app.listen(PORT, () => {
  console.log(`Monity API running on http://localhost:${PORT}`);
});
