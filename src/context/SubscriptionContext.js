import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

const API_BASE = 'http://localhost:4000/api';

export function SubscriptionProvider({ children }) {
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // betöltés a backendről, ha van token
  useEffect(() => {
    if (!token) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    async function fetchSubscriptions() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/subscriptions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Hiba történt a lekérés során');
        }
        const data = await res.json();
        setSubscriptions(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Nem sikerült betölteni az előfizetéseket.');
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriptions();
  }, [token]);

  const addSubscription = async (sub) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error('Create failed');
      const created = await res.json();
      setSubscriptions((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
      alert('Nem sikerült létrehozni az előfizetést.');
    }
  };

  const updateSubscription = async (id, data) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
    } catch (err) {
      console.error(err);
      alert('Nem sikerült frissíteni az előfizetést.');
    }
  };

  const deleteSubscription = async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed');
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      alert('Nem sikerült törölni az előfizetést.');
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{ subscriptions, loading, error, addSubscription, updateSubscription, deleteSubscription }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  return useContext(SubscriptionContext);
}
