import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-900/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          {/* Logo + brand */}
          <div className="flex items-center gap-2 font-semibold tracking-[0.2em] uppercase text-xs">
            <span className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-400 shadow-[0_0_18px_rgba(34,197,94,0.8)]" />
            <span>Monity</span>
          </div>

          {/* Nav + user */}
          <div className="flex items-center gap-4">
            {/* Fő menü */}
            <nav className="flex gap-2 text-sm">
              <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                  `px-3 py-1 rounded-full transition 
                  ${
                      isActive
                      ? 'bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-900 font-semibold'
                      : 'text-slate-200 hover:bg-slate-700/60'
                  }`
                  }
              >
                  Dashboard
              </NavLink>
              <NavLink
                  to="/subscriptions"
                  className={({ isActive }) =>
                  `px-3 py-1 rounded-full transition 
                  ${
                      isActive
                      ? 'bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-900 font-semibold'
                      : 'text-slate-200 hover:bg-slate-700/60'
                  }`
                  }
              >
                  Előfizetések
              </NavLink>
              <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                  `px-3 py-1 rounded-full transition 
                  ${
                      isActive
                      ? 'bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-900 font-semibold'
                      : 'text-slate-200 hover:bg-slate-700/60'
                  }`
                  }
              >
                  Értesítések
              </NavLink>
              <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                  `px-3 py-1 rounded-full transition 
                  ${
                      isActive
                      ? 'bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-900 font-semibold'
                      : 'text-slate-200 hover:bg-slate-700/60'
                  }`
                  }
              >
                  Beállítások
              </NavLink>
              </nav>


            {/* User info + logout */}
            {user && (
              <div className="flex items-center gap-2 text-xs">
                <div className="hidden sm:flex items-center gap-2 max-w-[180px]">
                  <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-semibold text-emerald-300">
                    {user.email[0]?.toUpperCase()}
                  </div>
                  <span className="truncate text-slate-300">
                    {user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-slate-500 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800/80"
                >
                  Kilépés
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 py-6 px-4">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/80 text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 py-2 text-center">
          © {new Date().getFullYear()} Monity • Okos előfizetés-követés
        </div>
      </footer>
    </div>
  );
}

export default Layout;
