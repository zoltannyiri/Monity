import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:4000/api';

function NotificationsPage() {
  const { token } = useAuth();
  const [state, setState] = useState({
    notifyDaysBefore: 7,
    count: 0,
    totalAmount: 0,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    async function fetchPreview() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/notifications/preview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error || 'Nem sikerült betölteni az értesítéseket.');
        }
        setState(body);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Nem sikerült betölteni az értesítéseket.');
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [token, reloadKey]);

  const handleMarkPaid = async (id) => {
    if (!token) return;
    try {
      setUpdatingId(id);
      setError('');
      const res = await fetch(
        `${API_BASE}/subscriptions/${id}/bump-next-charge`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body.error ||
            'Nem sikerült frissíteni a következő terhelés dátumát.'
        );
      }

      // újratöltjük az előnézetet
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      setError(
        err.message || 'Nem sikerült frissíteni a következő terhelés dátumát.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
        <p className="text-sm text-slate-400">
          Értesítés előnézet betöltése...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Értesítés előnézet</h1>

      {error && (
        <div className="rounded-2xl border border-red-500/70 bg-red-950/60 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {!error && (
        <>
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 text-sm text-slate-300">
            <p className="text-xs text-slate-400 mb-1">
              A beállítások alapján jelenleg az alábbi értesítést küldené ki a
              Monity.
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                • Értesítési ablak:{' '}
                <strong>{state.notifyDaysBefore} nap</strong>
              </li>
              <li>
                • Érintett előfizetések:{' '}
                <strong>{state.count} db</strong>
              </li>
              <li>
                • Várható összes terhelés:{' '}
                <strong>
                  {state.totalAmount.toLocaleString('hu-HU')} Ft
                </strong>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 text-sm text-slate-300">
            <h2 className="text-base font-semibold text-slate-100 mb-2">
              Közelgő terhelések listája
            </h2>

            {state.items.length === 0 ? (
              <p className="text-sm text-slate-400">
                Jelenleg nincs olyan előfizetés, amelyre értesítést kellene küldeni
                ebben az időablakban 🎉
              </p>
            ) : (
              <div className="space-y-2">
                {state.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-100">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {item.category || 'Nincs kategória'}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        {item.daysUntilCharge === 0
                          ? 'Ma terhelődik'
                          : item.daysUntilCharge === 1
                          ? 'Holnap terhelődik'
                          : `~ ${item.daysUntilCharge} nap múlva terhelődik`}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2 md:gap-4">
                      <div className="text-right text-xs">
                        <div className="text-sm text-slate-100">
                          {item.price.toLocaleString('hu-HU')} {item.currency}
                        </div>
                        <div className="text-slate-400">
                          {item.nextChargeDate
                            ? new Date(
                                item.nextChargeDate
                              ).toLocaleDateString('hu-HU')
                            : '-'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.billingCycle === 'monthly' ? 'Havi' : 'Éves'} díj
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(item.id)}
                        disabled={updatingId === item.id}
                        className="rounded-full border border-emerald-400/70 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-60"
                      >
                        {updatingId === item.id
                          ? 'Frissítés...'
                          : 'Fizetés rögzítése'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationsPage;
