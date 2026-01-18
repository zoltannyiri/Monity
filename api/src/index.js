require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// 🔥 Firebase Admin
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const fetch = require('node-fetch'); // ha nincs, npm install node-fetch@2
const FCM_SERVER_KEY = process.env.FIREBASE_SERVER_KEY;
const HOST = '0.0.0.0';

// middlewares
// app.use(cors({ origin: "http://localhost:3000" }));
app.use(cors());
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

async function getLiveRates() {
  try {
    const response = await fetch('https://api.frankfurter.dev/v1/latest?from=HUF&to=EUR,USD');
    const data = await response.json();
    return { EUR: 1 / data.rates.EUR, USD: 1 / data.rates.USD };
  } catch (err) {
    return { EUR: 385, USD: 355 };
  }
}

// 🔥 Firebase Admin inicializálása (Render-barát módon)
let serviceAccount;

if (process.env.FIREBASE_CONFIG_JSON) {
  // 1. Ha a Render-en vagyunk, a környezeti változóból vesszük a JSON-t
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
    console.log("✅ Firebase Config betöltve környezeti változóból.");
  } catch (err) {
    console.error("❌ Hiba a FIREBASE_CONFIG_JSON parszolása közben:", err);
  }
} else {
  // 2. Lokálisan (a saját gépeden) továbbra is a fájlt keresi
  const serviceAccountPath = process.env.FIREBASE_CREDENTIALS && path.resolve(__dirname, process.env.FIREBASE_CREDENTIALS);
  
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
    console.log("✅ Firebase Admin inicializálva fájlból.");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.warn("⚠️ Firebase service account nem található, a push értesítések nem fognak működni!");
}

// REGISZTRÁCIÓ
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body; // 🔥 Username is jön

    if (!email || !username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Minden mező kötelező, a jelszó min. 6 karakter.' });
    }

    // Ellenőrizzük, foglalt-e a felhasználónév
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Az email vagy a felhasználónév már foglalt.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
    });

    res.status(201).json({ 
      token: signToken(user), 
      user: { id: user.id, email: user.email, username: user.username } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a regisztráció során.' });
  }
});


// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // Az 'email' helyett 'identifier'-t várunk

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Hibás adatok.' });
    }

    res.json({ 
      token: signToken(user), 
      user: { id: user.id, email: user.email, username: user.username } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a belépés során.' });
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



async function sendPushToToken(pushToken, title, body) {
  if (!pushToken) {
    console.warn('Nincs pushToken, nem küldök FCM-et.');
    return;
  }

  try {
    const message = {
      token: pushToken,
      notification: {
        title,
        body,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };

    const response = await admin.messaging().send(message);
    console.log('FCM üzenet elküldve, messageId:', response);
  } catch (err) {
    console.error('FCM küldés hiba:', err);
  }
}





// GET /api/subscriptions
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  const items = await prisma.subscription.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

// POST /api/subscriptions
app.post('/api/subscriptions', authMiddleware, async (req, res) => {
  const { name, price, currency, billingCycle, nextChargeDate, category, notes } = req.body;
  const created = await prisma.subscription.create({
    data: { userId: req.userId, name, price: Number(price), currency, billingCycle, 
            nextChargeDate: nextChargeDate ? new Date(nextChargeDate) : null, category, notes }
  });
  res.status(201).json(created);
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




function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Hiányzó token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Érvénytelen token" });
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



app.get('/api/notifications/preview', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { notifyDaysBefore: true },
    });

    const notifyDays = user?.notifyDaysBefore || 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + notifyDays);

    // 1. Árfolyamok lekérése (EUR és USD -> HUF)
    let rates = { EUR: 385, USD: 355 }; // Biztonsági alapértékek
    try {
      const rateRes = await fetch('https://api.frankfurter.dev/v1/latest?from=HUF&to=EUR,USD');
      const rateData = await rateRes.json();
      // Mivel HUF-ból váltunk, az értéket invertálni kell (1 / rate)
      rates.EUR = 1 / rateData.rates.EUR;
      rates.USD = 1 / rateData.rates.USD;
    } catch (e) {
      console.error("Rate fetch hiba a preview-nál, fallback használata.");
    }

    const subs = await prisma.subscription.findMany({
      where: {
        userId: req.userId,
        nextChargeDate: { gte: today, lte: endDate },
      },
    });

    // 2. INTELLIGENS ÖSSZEGZÉS: Deviza szerinti átszámítás HUF-ra
    const totalAmountHuf = subs.reduce((sum, s) => {
      let priceInHuf = s.price;
      
      if (s.currency === 'EUR') {
        priceInHuf = s.price * rates.EUR;
      } else if (s.currency === 'USD') {
        priceInHuf = s.price * rates.USD;
      }
      
      return sum + priceInHuf;
    }, 0);

    const items = subs.map((s) => ({
      ...s,
      daysUntilCharge: Math.round((new Date(s.nextChargeDate) - today) / (1000 * 60 * 60 * 24)),
    }));

    res.json({
      notifyDaysBefore: notifyDays,
      count: items.length,
      totalAmount: Math.round(totalAmountHuf), // Már a pontos HUF összeg megy a telefonra
      items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hiba az előnézetnél.' });
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
        pushToken: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'Felhasználó nem található.' });

    const notifyDays = user.notifyDaysBefore || 7;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + notifyDays);

    const subs = await prisma.subscription.findMany({
      where: {
        userId: req.userId,
        nextChargeDate: { gte: today, lte: endDate },
      },
      orderBy: { nextChargeDate: 'asc' },
    });

    if (!subs.length) {
      return res.status(400).json({ error: 'Jelenleg nincs olyan előfizetés, ami az értesítési időablakon belül lenne.' });
    }

    // 🔥 Árfolyamok lekérése és konverzió
    const rates = await getLiveRates();
    const totalInHuf = subs.reduce((sum, s) => {
      let price = s.price;
      if (s.currency === 'EUR') price *= rates.EUR;
      else if (s.currency === 'USD') price *= rates.USD;
      return sum + price;
    }, 0);

    // Push küldése
    if (user.pushToken) {
      const title = `Monity – ${subs.length} közelgő terhelés`;
      const body = `A következő ${notifyDays} napban összesen kb. ${Math.round(totalInHuf).toLocaleString('hu-HU')} Ft terhelés várható.`;
      sendPushToToken(user.pushToken, title, body);
    }

    // Email összeállítása
    const lines = subs.map((s) => {
      const d = s.nextChargeDate ? new Date(s.nextChargeDate).toLocaleDateString('hu-HU') : '-';
      return `• ${s.name} – ${s.price.toLocaleString('hu-HU')} ${s.currency} – ${d}`;
    });

    const subject = `Monity – közelgő terhelések (${subs.length} db)`;
    const textBody =
      `Szia!\n\n` +
      `A Monity szerint a következő ${notifyDays} napban az alábbi előfizetések terhelődnek:\n\n` +
      lines.join('\n') +
      `\n\nÖsszes várható terhelés (becsült): ${Math.round(totalInHuf).toLocaleString('hu-HU')} Ft\n\n` +
      `Ha módosítani szeretnéd az értesítési időablakot, lépj be a Beállítások menübe.\n\n` +
      `Üdv,\nMonity`;

    await mailTransport.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: user.email,
      subject,
      text: textBody,
    });

    await prisma.user.update({
      where: { id: req.userId },
      data: { lastNotificationSentAt: new Date() },
    });

    res.json({ success: true, message: `Értesítések elküldve a(z) ${user.email} címre.` });
  } catch (err) {
    console.error('Send test error:', err);
    res.status(500).json({ error: 'Hiba történt az értesítés küldése közben.' });
  }
});

// Manuális dátum-korrekció minden előfizetésre
app.post('/api/subscriptions/fix-all-dates', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const expiredSubs = await prisma.subscription.findMany({
      where: {
        userId: req.userId,
        nextChargeDate: { lte: today },
      },
    });

    let updatedCount = 0;
    for (const sub of expiredSubs) {
      let nextDate = new Date(sub.nextChargeDate);
      while (nextDate <= today) {
        if (sub.billingCycle === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (sub.billingCycle === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
        else break;
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { nextChargeDate: nextDate },
      });
      updatedCount++;
    }

    res.json({ success: true, message: `${updatedCount} db előfizetés frissítve a jövőbe.` });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a dátumok javítása közben.' });
  }
});


// ───────────────────────────────────────────────
// Napi automatikus értesítés (cron)
// ───────────────────────────────────────────────

cron.schedule('0 8 * * *', async () => {
  console.log('[CRON] Napi értesítések futtatása...');
  
  try {
    const rates = await getLiveRates(); // Friss árfolyamok lekérése
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        notifyDaysBefore: true,
        pushToken: true,
      },
    });

    for (const user of users) {
      try {
        const notifyDays = user.notifyDaysBefore || 7;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + notifyDays);

        const subs = await prisma.subscription.findMany({
          where: {
            userId: user.id,
            nextChargeDate: { gte: today, lte: endDate },
          },
          orderBy: { nextChargeDate: 'asc' },
        });

        if (subs.length === 0) continue; // Nincs mit küldeni ennél a felhasználónál

        // Összegzés árfolyammal
        const totalInHuf = subs.reduce((sum, s) => {
          let p = s.price;
          if (s.currency === 'EUR') p *= rates.EUR;
          else if (s.currency === 'USD') p *= rates.USD;
          return sum + p;
        }, 0);

        // Email sorok generálása
        const lines = subs.map((s) => {
          const d = s.nextChargeDate ? new Date(s.nextChargeDate).toLocaleDateString('hu-HU') : '-';
          return `• ${s.name} – ${s.price.toLocaleString('hu-HU')} ${s.currency} – ${d}`;
        });

        const subject = `Monity – közelgő terhelések (${subs.length} db)`;
        const textBody =
          `Szia!\n\n` +
          `A Monity szerint a következő ${notifyDays} napban az alábbi előfizetéseid terhelődnek:\n\n` +
          lines.join('\n') +
          `\n\nÖsszes várható terhelés (becsült): ${Math.round(totalInHuf).toLocaleString('hu-HU')} Ft\n\n` +
          `Üdv,\nMonity`;

        // Email küldése
        await mailTransport.sendMail({
          from: process.env.MAIL_FROM || process.env.MAIL_USER,
          to: user.email,
          subject,
          text: textBody,
        });

        // Push küldése (ha van token)
        if (user.pushToken) {
          sendPushToToken(
            user.pushToken, 
            "Közelgő terhelések", 
            `${subs.length} tétel várható, összesen kb. ${Math.round(totalInHuf).toLocaleString('hu-HU')} Ft.`
          );
        }

        // Időbélyeg frissítése
        await prisma.user.update({
          where: { id: user.id },
          data: { lastNotificationSentAt: new Date() },
        });

        console.log(`[CRON] Értesítés elküldve: ${user.email}`);
      } catch (userErr) {
        console.error(`[CRON] Hiba a felhasználónál (${user.email}):`, userErr);
      }
    }
  } catch (err) {
    console.error('[CRON] Globális hiba:', err);
  }
});


// ─────────────────────────────────────────────────────────────────
// AUTOMATIKUS DÁTUM LÉPTETÉS (Minden nap 00:05-kor)
// ─────────────────────────────────────────────────────────────────
cron.schedule('5 0 * * *', async () => {
  console.log('[CRON] Előfizetési dátumok ellenőrzése és léptetése...');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    // 1. Megkeressük azokat az előfizetéseket, amiknek a terhelése ma vagy korábban volt
    const expiredSubs = await prisma.subscription.findMany({
      where: {
        nextChargeDate: {
          lte: today, // kisebb vagy egyenlő, mint a mai nap
        },
      },
    });

    console.log(`[CRON] ${expiredSubs.length} db lejárt dátumú előfizetést találtam.`);

    for (const sub of expiredSubs) {
      if (!sub.billingCycle || !sub.nextChargeDate) continue;

      let nextDate = new Date(sub.nextChargeDate);
      while (nextDate <= today) {
        if (sub.billingCycle === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (sub.billingCycle === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else {
          break;
        }
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { nextChargeDate: nextDate },
      });

      console.log(`[CRON] Automatikus frissítés: ${sub.name} -> Új dátum: ${nextDate.toLocaleDateString('hu-HU')}`);
    }
    
    if (expiredSubs.length > 0) {
      console.log('[CRON] Minden érintett dátum sikeresen frissítve.');
    }
  } catch (err) {
    console.error('[CRON] Hiba történt a dátumok léptetése közben:', err);
  }
});


// PUSH TOKEN REGISZTRÁCIÓ
app.post('/api/push/register', authMiddleware, async (req, res) => {
  try {
    const { pushToken } = req.body;
    console.log('>>> /api/push/register', {
      userId: req.userId,
      pushToken,
    });

    if (!pushToken || typeof pushToken !== 'string') {
      return res.status(400).json({ error: 'Hiányzó vagy érvénytelen push token.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { pushToken },
      select: { id: true, email: true, pushToken: true },
    });

    res.json({
      success: true,
      user: updated,
    });
  } catch (err) {
    console.error('Push register error', err);
    res.status(500).json({ error: 'Nem sikerült elmenteni a push tokent.' });
  }
});


// árfolyam lekérés
app.get('/api/exchange-rate', async (req, res) => {
  try {
    const response = await fetch('https://api.frankfurter.dev/v1/latest?from=EUR&to=HUF');
    const data = await response.json();
    
    const rate = data.rates.HUF;
    res.json({ rate, date: data.date, source: 'Frankfurter API' });
  } catch (err) {
    console.error('Árfolyam lekérdezési hiba:', err);
    res.json({ rate: 410, date: new Date().toISOString(), source: 'Fallback' });
  }
});





app.listen(PORT, HOST, () => {
  console.log(`Monity API running on http://${HOST}:${PORT}`);
});
