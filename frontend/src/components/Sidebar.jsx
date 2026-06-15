import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  KeyRound, 
  Smartphone, 
  Users, 
  ShieldCheck, 
  ScrollText, 
  LogOut,
  LayoutGrid,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  
  const userLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Access Request', path: '/access-request', icon: KeyRound },
    { name: 'My Devices', path: '/devices', icon: Smartphone }
  ];

  const adminLinks = [
    { name: 'Admin Overview', path: '/admin', icon: LayoutGrid },
    { name: 'User Directory', path: '/admin/users', icon: Users },
    { name: 'All Devices', path: '/admin/devices', icon: Smartphone },
    { name: 'Sessions', path: '/admin/sessions', icon: Activity },
    { name: 'Policies', path: '/admin/policies', icon: ShieldCheck },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: ScrollText }
  ];

  const LinkItem = ({ link }) => {
    const Icon = link.icon;
    return (
      <NavLink
        to={link.path}
        onClick={() => {
          if (window.innerWidth < 768 && toggleSidebar) {
            toggleSidebar();
          }
        }}
        className={({ isActive }) => 
          `flex items-center gap-3 px-4 py-3 text-sm font-sans tracking-wide transition-colors duration-150 border-l-[3px] ${
            isActive 
              ? 'border-null-signal text-null-text font-medium bg-null-surface-raised/40' 
              : 'border-transparent text-null-muted hover:text-null-text'
          }`
        }
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {link.name}
      </NavLink>
    );
  };

  return (
    <aside 
      className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col w-[240px] bg-null-surface border-r border-null-border transition-transform duration-200 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-null-border bg-null-bg/20">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-widest text-null-text">
            NULL<span className="text-null-signal font-mono text-xs"> // ZTNA</span>
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* User Navigation Section */}
        <div className="flex flex-col">
          {userLinks.map((link) => (
            <LinkItem key={link.path} link={link} />
          ))}
        </div>

        {/* Administrator Section */}
        {user?.role_name === 'Administrator' && (
          <div className="mt-8">
            <div className="px-4 mb-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-null-muted opacity-60">
                ADMIN CONSOLE
              </span>
            </div>
            <div className="flex flex-col">
              {adminLinks.map((link) => (
                <LinkItem key={link.path} link={link} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer / User Identity */}
      <div className="p-4 border-t border-null-border bg-null-bg/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm font-sans text-null-muted hover:text-null-deny hover:bg-null-deny-dim/20 rounded transition-colors duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
