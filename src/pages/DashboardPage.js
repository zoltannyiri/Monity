import React, { useMemo } from 'react';
import { useSubscriptions } from '../context/SubscriptionContext';

const SETTINGS_STORAGE_KEY = 'monity_user_settings_v1';

function getNotifyDays() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return 7;
    const parsed = JSON.parse(raw);
    if (
      parsed.notifyDaysBefore === null ||
      parsed.notifyDaysBefore === undefined ||
      Number.isNaN(Number(parsed.notifyDaysBefore))
    ) {
      return 7;
    }
    return Number(parsed.notifyDaysBefore);
  } catch {
    return 7;
  }
}

function DashboardPage() {
  const { subscriptions, loading, error } = useSubscriptions();

  const today = new Date();
  const notifyDays = getNotifyDays();
  const inXDays = new Date();
  inXDays.setDate(today.getDate() + notifyDays);

  const stats = useMemo(() => {
    if (!subscriptions.length) {
      return {
        totalMonthly: 0,
        totalYearly: 0,
        count: 0,
        upcoming: [],
        upcomingTotal: 0,
        categoryBreakdown: [],
        maxCategoryMonthly: 0,
      };
    }

    let monthly = 0;
    let yearly = 0;
    const upcomingList = [];
    let upcomingTotal = 0;

    const categoryTotals = {}; // category -> monthly cost

    for (const s of subscriptions) {
      // mennyibe kerül havonta ez az előfizetés
      let monthlyCostForThis = 0;

      if (s.billingCycle === 'monthly') {
        monthly += s.price;
        yearly += s.price * 12;
        monthlyCostForThis = s.price;
      } else if (s.billingCycle === 'yearly') {
        yearly += s.price;
        monthly += s.price / 12;
        monthlyCostForThis = s.price / 12;
      }

      // kategória havi költés gyűjtése
      const cat = s.category && s.category.trim() ? s.category : 'Egyéb';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + monthlyCostForThis;

      // közelgő terhelések
      if (s.nextChargeDate) {
        const d = new Date(s.nextChargeDate);
        if (d >= today && d <= inXDays) {
          upcomingList.push(s);
          upcomingTotal += s.price;
        }
      }
    }

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, monthlyCost]) => ({
        category,
        monthlyCost,
      }))
      .sort((a, b) => b.monthlyCost - a.monthlyCost);

    const maxCategoryMonthly =
      categoryBreakdown.length > 0
        ? Math.max(...categoryBreakdown.map((c) => c.monthlyCost))
        : 0;

    return {
      totalMonthly: Math.round(monthly),
      totalYearly: Math.round(yearly),
      count: subscriptions.length,
      upcoming: upcomingList,
      upcomingTotal,
      categoryBreakdown,
      maxCategoryMonthly,
    };
  }, [subscriptions, notifyDays, today, inXDays]);

  // LOADING / ERROR
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
        <p className="text-sm text-slate-400">Előfizetések betöltése...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="rounded-2xl border border-red-500/70 bg-red-950/60 p-4 text-sm text-red-100">
          Hiba történt az adatok betöltése közben:
          <br />
          <span className="font-mono text-xs">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* Felső stat kártyák */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-700/70 bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 p-4 shadow-xl">
          <p className="text-xs font-medium text-emerald-300/90 uppercase tracking-wide">
            Havi költés
          </p>
          <p className="mt-2 text-2xl font-bold">
            {stats.totalMonthly.toLocaleString('hu-HU')} Ft
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Előfizetések várható havi terhelése.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-gradient-to-br from-sky-500/20 via-slate-900 to-slate-950 p-4 shadow-xl">
          <p className="text-xs font-medium text-sky-300/90 uppercase tracking-wide">
            Éves költés
          </p>
          <p className="mt-2 text-2xl font-bold">
            {stats.totalYearly.toLocaleString('hu-HU')} Ft
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Havi és éves díjak átszámolva éves szintre.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-slate-950 p-4 shadow-xl">
          <p className="text-xs font-medium text-fuchsia-300/90 uppercase tracking-wide">
            Előfizetések száma
          </p>
          <p className="mt-2 text-2xl font-bold">{stats.count}</p>
          <p className="mt-1 text-xs text-slate-300">
            Aktívan nyilvántartott szolgáltatások.
          </p>
        </div>
      </div>

      {/* Összefoglaló + Közelgő terhelések */}
      <div className="grid gap-5 md:grid-cols-[1.4fr,1fr]">
        <section className="rounded-2xl border border-slate-700/70 bg-slate-900/90 shadow-xl p-5">
          <h2 className="text-base font-semibold text-slate-100">
            Összefoglaló
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            A Monity segít átlátni, hogy mennyit visznek el havonta az előfizetések,
            és mikor számíthatsz terhelésre.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            <li>
              • Havi költés:{' '}
              <strong>
                {stats.totalMonthly.toLocaleString('hu-HU')} Ft
              </strong>
            </li>
            <li>
              • Éves költés:{' '}
              <strong>
                {stats.totalYearly.toLocaleString('hu-HU')} Ft
              </strong>
            </li>
            <li>
              • Előfizetések: <strong>{stats.count} db</strong>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-700/70 bg-slate-900/90 shadow-xl p-5">
          <h2 className="text-base font-semibold text-slate-100">
            Következő {notifyDays} nap terhelései
          </h2>

          {stats.upcoming.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              Nincs közelgő terhelés 🎉
            </p>
          )}

          {stats.upcoming.length > 0 && (
            <>
              <p className="mt-2 text-xs text-slate-400">
                Összesen{' '}
                <span className="font-semibold text-slate-200">
                  {stats.upcomingTotal.toLocaleString('hu-HU')} Ft
                </span>{' '}
                várható terhelés.
              </p>
              <ul className="mt-3 divide-y divide-slate-800 text-sm">
                {stats.upcoming.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-400">
                        {s.category || 'Nincs kategória'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>
                        {s.price.toLocaleString('hu-HU')} {s.currency}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(s.nextChargeDate).toLocaleDateString('hu-HU')}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Kategória bontás (mini "chart") */}
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/90 shadow-xl p-5">
        <h2 className="text-base font-semibold text-slate-100">
          Kategória bontás (havi költés)
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          A kategóriákban a havi szintre átszámolt összesített költés látható.
        </p>

        {stats.categoryBreakdown.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Még nincs elég adat a kategória bontáshoz. Adj meg néhány előfizetést
            és kategóriát.
          </p>
        )}

        {stats.categoryBreakdown.length > 0 && (
          <div className="mt-4 space-y-3">
            {stats.categoryBreakdown.map((cat) => {
              const ratio =
                stats.maxCategoryMonthly > 0
                  ? cat.monthlyCost / stats.maxCategoryMonthly
                  : 0;
              const widthPercent = Math.max(8, Math.round(ratio * 100)); // hogy legyen min. látszó sáv

              return (
                <div key={cat.category} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">
                      {cat.category}
                    </span>
                    <span className="text-slate-300">
                      {Math.round(cat.monthlyCost).toLocaleString('hu-HU')} Ft / hó
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
