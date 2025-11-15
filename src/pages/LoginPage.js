import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Hiba történt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900/90 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
              <span className="h-4 w-4 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 shadow-[0_0_16px_rgba(34,197,94,0.9)]" />
              <span>Monity</span>
            </div>
            <h1 className="mt-2 text-lg font-semibold">
              {mode === 'login' ? 'Bejelentkezés' : 'Regisztráció'}
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-500/70 bg-red-950/60 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs text-slate-300">Email</label>
            <input
              type="email"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-sky-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="te@pelda.hu"
              required
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs text-slate-300">Jelszó</label>
            <input
              type="password"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-sky-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Legalább 6 karakter"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 hover:brightness-105 disabled:opacity-60"
          >
            {submitting
              ? 'Feldolgozás...'
              : mode === 'login'
              ? 'Bejelentkezés'
              : 'Regisztráció'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <>
              Nincs még fiókod?{' '}
              <button
                type="button"
                className="text-emerald-300 hover:text-emerald-200 underline"
                onClick={() => setMode('register')}
              >
                Regisztráció
              </button>
            </>
          ) : (
            <>
              Már van fiókod?{' '}
              <button
                type="button"
                className="text-emerald-300 hover:text-emerald-200 underline"
                onClick={() => setMode('login')}
              >
                Bejelentkezés
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
