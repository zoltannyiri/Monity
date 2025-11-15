import React from 'react';

function SubscriptionList({ items, onEdit, onDelete }) {
  const today = new Date();
  const in7Days = new Date();
  in7Days.setDate(today.getDate() + 7);

  const isSoon = (nextChargeDate) => {
    if (!nextChargeDate) return false;
    const d = new Date(nextChargeDate);
    return d >= today && d <= in7Days;
  };

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 text-sm text-slate-400">
        Még nincs egy előfizetés sem felvéve.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-4 shadow-xl overflow-x-auto">
      <table className="min-w-full text-sm text-slate-100">
        <thead>
          <tr className="border-b border-slate-800 text-xs text-slate-400">
            <th className="py-2 pr-3 text-left font-medium">Név</th>
            <th className="py-2 px-3 text-left font-medium">Összeg</th>
            <th className="py-2 px-3 text-left font-medium">Ciklus</th>
            <th className="py-2 px-3 text-left font-medium">Következő terhelés</th>
            <th className="py-2 px-3 text-left font-medium">Kategória</th>
            <th className="py-2 px-3 text-left font-medium">Státusz</th>
            <th className="py-2 pl-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr
              key={s.id}
              className="border-b border-slate-800/80 last:border-0 hover:bg-slate-800/60"
            >
              <td className="py-2 pr-3">{s.name}</td>
              <td className="py-2 px-3">
                {s.price.toLocaleString('hu-HU')} {s.currency}
              </td>
              <td className="py-2 px-3">
                {s.billingCycle === 'monthly' ? 'Havi' : 'Éves'}
              </td>
              <td className="py-2 px-3">
                {s.nextChargeDate
                  ? new Date(s.nextChargeDate).toLocaleDateString('hu-HU')
                  : '-'}
              </td>
              <td className="py-2 px-3">{s.category || '-'}</td>

              {/* ÚJ: Státusz oszlop */}
              <td className="py-2 px-3">
                {isSoon(s.nextChargeDate) && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/50">
                    HAMAROSAN
                  </span>
                )}
              </td>

              {/* Műveletek */}
              <td className="py-2 pl-3 text-right">
                <div className="inline-flex gap-1">
                  <button
                    onClick={() => onEdit(s)}
                    className="rounded-full border border-slate-500 px-2 py-0.5 text-xs hover:bg-slate-800"
                  >
                    Szerk.
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    className="rounded-full border border-red-500/80 px-2 py-0.5 text-xs text-red-200 hover:bg-red-900/60"
                  >
                    Törlés
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}

export default SubscriptionList;
