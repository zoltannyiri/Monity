import React, { useEffect, useState } from 'react';

const defaults = getUserDefaults();

const emptyForm = {
  name: '',
  price: '',
  currency: defaults.defaultCurrency,
  billingCycle: defaults.defaultBillingCycle,
  nextChargeDate: '',
  category: '',
  notes: '',
};
const SETTINGS_STORAGE_KEY = 'monity_user_settings_v1';

function getUserDefaults() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        defaultCurrency: 'HUF',
        defaultBillingCycle: 'monthly',
      };
    }
    const parsed = JSON.parse(raw);
    return {
      defaultCurrency: parsed.defaultCurrency || 'HUF',
      defaultBillingCycle: parsed.defaultBillingCycle || 'monthly',
    };
  } catch {
    return {
      defaultCurrency: 'HUF',
      defaultBillingCycle: 'monthly',
    };
  }
}


function SubscriptionForm({ initialData, onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (initialData) {
      const nextCharge =
        initialData.nextChargeDate
          ? initialData.nextChargeDate.slice(0, 10)
          : '';

      setForm({
        name: initialData.name || '',
        price: initialData.price?.toString() || '',
        currency: initialData.currency || 'HUF',
        billingCycle: initialData.billingCycle || 'monthly',
        nextChargeDate: nextCharge,
        category: initialData.category || '',
        notes: initialData.notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialData]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;

    onSubmit({
      ...form,
      price: Number(form.price),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-2xl border border-slate-700/70 bg-slate-900/90 p-5 shadow-xl flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-300">
          Szolgáltatás neve
        </label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Netflix, Spotify..."
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">Díj</label>
          <input
            name="price"
            type="number"
            value={form.price}
            onChange={handleChange}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">Pénznem</label>
          <select
            name="currency"
            value={form.currency}
            onChange={handleChange}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
          >
            <option value="HUF">HUF</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">Ciklus</label>
          <select
            name="billingCycle"
            value={form.billingCycle}
            onChange={handleChange}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
          >
            <option value="monthly">Havi</option>
            <option value="yearly">Éves</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">
            Következő terhelés dátuma
          </label>
          <input
            type="date"
            name="nextChargeDate"
            value={form.nextChargeDate || ''}
            onChange={handleChange}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-300">Kategória</label>
        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="Streaming, Telefon, Szoftver..."
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-300">Megjegyzés</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
      </div>

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 hover:brightness-105"
        >
          Mentés
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800/80"
          >
            Mégse
          </button>
        )}
      </div>
    </form>
  );
}

export default SubscriptionForm;
