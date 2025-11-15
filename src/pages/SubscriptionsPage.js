import React, { useMemo, useState } from 'react';
import { useSubscriptions } from '../context/SubscriptionContext';
import SubscriptionList from '../components/SubscriptionList';
import SubscriptionForm from '../components/SubscriptionForm';

function SubscriptionsPage() {
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription, loading, error } =
    useSubscriptions();

  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (sub) => {
    setEditing(sub);
    setShowForm(true);
  };

  const handleSubmit = (data) => {
    if (editing) {
      updateSubscription(editing.id, data);
    } else {
      addSubscription(data);
    }
    setShowForm(false);
    setEditing(null);
  };

  // Kategóriák listája (selecthez)
  const categories = useMemo(() => {
    const set = new Set();
    subscriptions.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [subscriptions]);

  // Keresés + kategóriaszűrés
  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory =
        categoryFilter === 'all' ||
        (s.category && s.category === categoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [subscriptions, search, categoryFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
        <p className="text-sm text-slate-400">Előfizetések betöltése...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Fejléc + új gomb */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold">Előfizetések</h1>
        <div className="flex items-center gap-2">
          {!showForm && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 hover:brightness-105"
            >
              + Új előfizetés
            </button>
          )}
        </div>
      </div>

      {/* Szűrők */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Keresés név vagy kategória alapján..."
            className="w-full md:w-72 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Kategória:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
          >
            <option value="all">Összes</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/60 bg-red-950/60 p-3 text-xs text-red-100">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <SubscriptionForm
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {/* Lista már a szűrt adatokkal */}
      <SubscriptionList
        items={filtered}
        onEdit={handleEdit}
        onDelete={deleteSubscription}
      />
    </div>
  );
}

export default SubscriptionsPage;
