import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Shield,
  Wifi,
  Terminal,
  CheckCircle,
  Copy,
  Server,
  Lock
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const localHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const lanUrl = `http://${localHost === 'localhost' ? '192.168.1.XXX' : localHost}:5173`;

  const handleCopyLAN = () => {
    navigator.clipboard.writeText(lanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-600" />
          <span>System & Workspace Settings</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize interface appearance and review LAN deployment configuration
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance Settings */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sun className="w-4 h-4 text-indigo-600" />
            <span>Appearance & Theme</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select how the Intranet Mailing interface looks on your workstation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Light Mode */}
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition ${
                theme === 'light'
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs font-bold">Light Mode</p>
                <p className="text-[10px] text-slate-400">Clean enterprise white</p>
              </div>
            </button>

            {/* Dark Mode */}
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition ${
                theme === 'dark'
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-xs font-bold">Dark Mode</p>
                <p className="text-[10px] text-slate-400">Deep midnight charcoal</p>
              </div>
            </button>

            {/* System Mode */}
            <button
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition ${
                theme === 'system'
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Laptop className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs font-bold">System Default</p>
                <p className="text-[10px] text-slate-400">Match OS preferences</p>
              </div>
            </button>
          </div>
        </div>

        {/* LAN Deployment & Multi-Device Access Guide */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-600" />
              <span>LAN / Intranet Multi-Device Connectivity</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Host Interface Bound: 0.0.0.0
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Other laptops, phones, and laboratory computers connected to the same Wi-Fi or LAN subnet can interact with this communication server seamlessly.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              How to access from another LAN computer:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                Open PowerShell on this host computer and type: <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono text-indigo-600 dark:text-indigo-400">ipconfig</code>
              </li>
              <li>
                Look for your <strong>IPv4 Address</strong> (e.g. <code>192.168.1.105</code>).
              </li>
              <li>
                On the second device, open any browser and navigate to:
              </li>
            </ol>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 text-white font-mono text-xs">
              <span>{lanUrl}</span>
              <button
                onClick={handleCopyLAN}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-[11px] font-sans font-semibold transition"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Active Session */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Cybersecurity Guardrails</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="font-bold text-slate-900 dark:text-slate-100">SQL Injection Defense</p>
              <p>Strictly parameterized SQLite prepared queries and type coercion across all endpoints.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="font-bold text-slate-900 dark:text-slate-100">IDOR Prevention</p>
              <p>Granular ownership checks ensure users can never view other members' unauthorized mail.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
