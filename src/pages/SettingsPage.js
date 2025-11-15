import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:4000/api';
const SETTINGS_STORAGE_KEY = 'monity_user_settings_v1';

function SettingsPage() {
  const { token, user } = useAuth();
  const [form, setForm] = useState({
    defaultCurrency: 'HUF',
    defaultBillingCycle: 'monthly',
    notifyDaysBefore: 7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchSettings() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error || 'Nem sikerült betölteni a beállításokat.');
        }

        const normalized = {
          defaultCurrency: body.defaultCurrency || 'HUF',
          defaultBillingCycle: body.defaultBillingCycle || 'monthly',
          notifyDaysBefore:
            body.notifyDaysBefore !== null && body.notifyDaysBefore !== undefined
              ? body.notifyDaysBefore
              : 7,
        };

        setForm(normalized);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      } catch (err) {
        console.error(err);
        setError(err.message || 'Nem sikerült betölteni a beállításokat.');
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'notifyDaysBefore'
          ? value === ''
            ? ''
            : Number(value)
          : value,
    }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    try {
      setSaving(true);
      setError('');
      setSaved(false);
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Nem sikerült menteni a beállításokat.');
      }

      const normalized = {
        defaultCurrency: body.defaultCurrency || 'HUF',
        defaultBillingCycle: body.defaultBillingCycle || 'monthly',
        notifyDaysBefore:
          body.notifyDaysBefore !== null && body.notifyDaysBefore !== undefined
            ? body.notifyDaysBefore
            : 7,
      };

      setForm(normalized);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Nem sikerült menteni a beállításokat.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
        <p className="text-sm text-slate-400">Beállítások betöltése...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Beállítások</h1>

      {error && (
        <div className="rounded-2xl border border-red-500/70 bg-red-950/60 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 text-sm text-slate-300 flex flex-col gap-3">
        <div className="text-xs text-slate-400 mb-1">
          Bejelentkezve:{' '}
          <span className="font-mono text-slate-200">
            {user?.email}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-300">
                Alap pénznem
              </label>
              <select
                name="defaultCurrency"
                value={form.defaultCurrency}
                onChange={handleChange}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
              >
                <option value="HUF">HUF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-300">
                Alap számlázási ciklus
              </label>
              <select
                name="defaultBillingCycle"
                value={form.defaultBillingCycle}
                onChange={handleChange}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
              >
                <option value="monthly">Havi</option>
                <option value="yearly">Éves</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 md:max-w-xs">
            <label className="text-xs font-medium text-slate-300">
              Értesítés a terhelés előtt (nap)
            </label>
            <input
              type="number"
              name="notifyDaysBefore"
              value={form.notifyDaysBefore}
              onChange={handleChange}
              min={0}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
            <p className="text-[11px] text-slate-400">
              Később a Monity email/push értesítései ezt az értéket fogják használni.
            </p>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 hover:brightness-105 disabled:opacity-60"
            >
              {saving ? 'Mentés...' : 'Beállítások mentése'}
            </button>
            {saved && (
              <span className="text-xs text-emerald-300">
                ✔ Beállítások elmentve
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettingsPage;
