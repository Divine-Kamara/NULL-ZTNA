import React, { useState, useEffect } from 'react';
import { Menu, Shield, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Badge from './Badge';

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

const NavBar = ({ toggleSidebar, title = 'Zero Trust Console' }) => {
  const { user, token, logout } = useAuth();
  const [timeLeft, setTimeLeft] = useState('SESSION --:--');

  useEffect(() => {
    if (!token) return;

    const jwtPayload = parseJwt(token);
    if (!jwtPayload || !jwtPayload.exp) return;

    const expTimestamp = jwtPayload.exp;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = expTimestamp - now;

      if (diff <= 0) {
        setTimeLeft('SESSION EXPIRED');
        logout(); // Auto-logout when token expires
      } else {
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        setTimeLeft(`SESSION ${mins}:${secs}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [token, logout]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-null-surface border-b border-null-border">
      {/* Mobile Toggle & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-null-muted hover:text-null-text md:hidden focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="font-sans text-base font-semibold text-null-text tracking-wide md:text-lg">
          {title}
        </h1>
      </div>

      {/* User Info & Session Time */}
      <div className="flex items-center gap-4">
        {/* Countdown */}
        {token && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-null-bg/50 border border-null-border rounded text-xs font-mono text-null-warn">
            <Clock className="w-3.5 h-3.5" />
            {timeLeft}
          </div>
        )}

        {/* User Identity */}
        {user && (
          <div className="flex items-center gap-2 border-l border-null-border pl-4">
            <span className="hidden md:inline font-sans text-sm font-medium text-null-text">
              {user.full_name}
            </span>
            <Badge status={user.role_name} />
          </div>
        )}
      </div>
    </header>
  );
};

export default NavBar;
