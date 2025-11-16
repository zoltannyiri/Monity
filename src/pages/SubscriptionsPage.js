import React, { useMemo, useState } from 'react';
import { useSubscriptions } from '../context/SubscriptionContext';
import SubscriptionList from '../components/SubscriptionList';
import SubscriptionForm from '../components/SubscriptionForm';

const TEMPLATES = [
  {
    id: 'netflix',
    label: 'Netflix',
    name: 'Netflix',
    price: 4990,
    currency: 'HUF',
    billingCycle: 'monthly',
    category: 'Streaming',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    name: 'Spotify',
    price: 1990,
    currency: 'HUF',
    billingCycle: 'monthly',
    category: 'Zene',
  },
  {
    id: 'hbomax',
    label: 'HBO Max',
    name: 'HBO Max',
    price: 2390,
    currency: 'HUF',
    billingCycle: 'monthly',
    category: 'Streaming',
  },
  {
    id: 'ytpremium',
    label: 'YouTube Premium',
    name: 'YouTube Premium',
    price: 2790,
    currency: 'HUF',
    billingCycle: 'monthly',
    category: 'Zene / Videó',
  },
];

function SubscriptionsPage() {
  const {
    subscriptions,
    loading,
    error,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  } = useSubscriptions();


  const [filterText, setFilterText] = useState('');
  const [filterCycle, setFilterCycle] = useState('all');
  const [formMode, setFormMode] = useState(null); // null | 'create' | 'edit'
  const [editing, setEditing] = useState(null); // subscription vagy template adat

  const handleNew = () => {
    setEditing(null);
    setFormMode('create');
  };

  const handleTemplateClick = (template) => {
    // template -> előtöltött űrlap
    setEditing({
      id: undefined,
      name: template.name,
      price: template.price,
      currency: template.currency,
      billingCycle: template.billingCycle,
      category: template.category,
      nextChargeDate: '',
      notes: '',
    });
    setFormMode('create');
  };

  const handleEdit = (subscription) => {
    setEditing(subscription);
    setFormMode('edit');
  };

  const handleCancelForm = () => {
    setEditing(null);
    setFormMode(null);
  };

  const handleSave = async (data) => {
    if (formMode === 'edit' && editing) {
      await updateSubscription(editing.id, data);
    } else {
      await addSubscription(data);
    }
    setEditing(null);
    setFormMode(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Biztosan törlöd ezt az előfizetést?')) return;
    await deleteSubscription(id);
  };

  const filteredSubscriptions = useMemo(() => {
    let list = subscriptions;

    if (filterText.trim()) {
      const text = filterText.toLowerCase();
      list = list.filter((s) => {
        const name = s.name?.toLowerCase() || '';
        const cat = s.category?.toLowerCase() || '';
        return name.includes(text) || cat.includes(text);
      });
    }

    if (filterCycle !== 'all') {
      list = list.filter((s) => s.billingCycle === filterCycle);
    }

    return list;
  }, [subscriptions, filterText, filterCycle]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Előfizetések</h1>
        <p className="text-xs text-slate-400">
          Vedd sorra az összes előfizetésed, és nézd meg, mennyit visznek el havonta.
        </p>
      </div>

      {/* Kereső + szűrők + sablon gombok */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 md:max-w-sm w-full">
            <input
              type="text"
              placeholder="Keresés név vagy kategória alapján..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Számlázási ciklus:</span>
            <select
              value={filterCycle}
              onChange={(e) => setFilterCycle(e.target.value)}
              className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-100 outline-none focus:border-sky-400"
            >
              <option value="all">Összes</option>
              <option value="monthly">Havi</option>
              <option value="yearly">Éves</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNew}
            className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
          >
            + Új előfizetés
          </button>

          <span className="text-[11px] text-slate-400">
            Gyors sablonok:
          </span>

          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleTemplateClick(tpl)}
              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:border-emerald-400/70 hover:bg-emerald-400/5"
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista + űrlap */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
          <p className="text-sm text-slate-400">Előfizetések betöltése...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/70 bg-red-950/60 p-4 text-sm text-red-100">
          Hiba történt az előfizetések betöltése közben:
          <br />
          <span className="font-mono text-xs">{error}</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
          <div>
            <SubscriptionList
              items={filteredSubscriptions}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 text-sm text-slate-300">
            {formMode ? (
              <>
                <h2 className="text-base font-semibold text-slate-100 mb-2">
                  {formMode === 'edit'
                    ? 'Előfizetés szerkesztése'
                    : 'Új előfizetés'}
                </h2>
                <SubscriptionForm
                  initialData={editing}
                  onCancel={handleCancelForm}
                  onSubmit={handleSave}
                />
              </>
            ) : (
              <div className="text-xs text-slate-400">
                Válassz egy előfizetést a listából a szerkesztéshez, vagy kattints
                az „Új előfizetés” gombra egy új hozzáadásához.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionsPage;
