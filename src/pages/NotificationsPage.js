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
  const [sendLoading, setSendLoading] = useState(false);
  const [sendMessage, setSendMessage] = useState('');

    const handleSendTestEmail = async () => {
    if (!token) return;
    try {
      setSendLoading(true);
      setSendMessage('');
      setError('');
      const res = await fetch(`${API_BASE}/notifications/send-test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body.error ||
            'Nem sikerült elküldeni a teszt emailt.'
        );
      }
      setSendMessage(body.message || 'Teszt email elküldve.');
    } catch (err) {
      console.error(err);
      setError(
        err.message || 'Nem sikerült elküldeni a teszt emailt.'
      );
    } finally {
      setSendLoading(false);
    }
  };


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
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 text-sm text-slate-300 flex flex-col gap-3">
            <div>
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

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendLoading || state.count === 0}
                className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-4 py-1.5 text-xs font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 hover:brightness-105 disabled:opacity-60"
              >
                {sendLoading
                  ? 'Teszt email küldése...'
                  : 'Teszt email küldése'}
              </button>
              {sendMessage && (
                <span className="text-[11px] text-emerald-300">
                  {sendMessage}
                </span>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}

export default NotificationsPage;
