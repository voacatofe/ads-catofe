import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Save, Check, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---
interface AdAccount {
  id: string; // internal id from CSV
  name: string;
  accountId: string; // The data needed for payload
  status: string;
}

// --- Utility for className merging ---
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Icons ---
const Spinner = () => <Loader2 className="animate-spin h-5 w-5 text-current" />;

// --- Main Component ---
function App() {
  const [data, setData] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load Data from API
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/accounts');
        if (!response.ok) throw new Error('Failed to fetch accounts from API');
        const jsonData = await response.json();

        // Map API response to frontend state
        // Backend returns: { id, name, accountId, status, ativo_catofe }
        const parsed: AdAccount[] = jsonData.map((item: any) => ({
          id: item.id || '',
          name: item.name || 'Unknown',
          accountId: item.accountId || '',
          status: item.status || 'UNKNOWN'
        }));

        setData(parsed);

        // Set initial selection based on ativo_catofe
        const activeIds = new Set<string>();
        jsonData.forEach((item: any) => {
          if (item.ativo_catofe) {
            activeIds.add(item.accountId);
          }
        });
        setSelectedIds(activeIds);

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter
  const filteredData = useMemo(() => {
    const lower = search.toLowerCase();
    return data.filter(item => item.name.toLowerCase().includes(lower));
  }, [data, search]);

  // Handlers
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredData.forEach(d => next.add(d.accountId));
      setSelectedIds(next);
    }
  };

  const handleSave = async () => {
    // Save selection to Backend
    setSaving(true);
    setSaveStatus('idle');
    try {
      const payload = {
        accountIds: Array.from(selectedIds)
      };

      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Save failed');

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-24">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8 shadow-sm">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Ad Manager
              </h1>
              <p className="text-sm text-slate-500">Select accounts to sync</p>
            </div>
            {/* Stats */}
            <div className="text-right">
              <span className="text-2xl font-semibold text-indigo-600">
                {selectedIds.size}
              </span>
              <span className="text-xs text-slate-400 block uppercase tracking-wider font-medium">Selected</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search Ad Accounts..."
              className="block w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all shadow-inner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Spinner />
            <p className="mt-2 text-sm">Loading accounts...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 pb-2 text-sm text-slate-500">
              <span>{filteredData.length} accounts found</span>
              <button
                onClick={handleSelectAll}
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                {selectedIds.size === filteredData.length && filteredData.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid gap-3">
              <AnimatePresence>
                {filteredData.map((item) => {
                  const isSelected = selectedIds.has(item.accountId);
                  return (
                    <motion.div
                      key={item.accountId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => toggleSelection(item.accountId)}
                      className={cn(
                        "group relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border",
                        isSelected
                          ? "bg-white border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500"
                          : "bg-white border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md"
                      )}
                    >
                      {/* Checkbox Visual */}
                      <div className={cn(
                        "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-colors duration-200",
                        isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 group-hover:border-indigo-400"
                      )}>
                        {isSelected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-medium truncate transition-colors",
                          isSelected ? "text-indigo-900" : "text-slate-900"
                        )}>
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-400 truncate font-mono mt-0.5">
                          ID: {item.accountId}
                        </p>
                      </div>

                      {/* Status indicator if needed */}
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        item.status === '1' || item.status === 'ACTIVE' ? "bg-emerald-400" : "bg-slate-300"
                      )} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredData.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p>No accounts found matching "{search}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer / Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.1)]">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-end gap-4">

          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "w-full md:w-auto px-8 py-2.5 rounded-lg font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 min-w-[140px]",
              saving
                ? "bg-indigo-400 cursor-wait"
                : saveStatus === 'success'
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : saveStatus === 'error'
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/25 active:scale-95"
            )}
          >
            {saving ? (
              <Spinner />
            ) : saveStatus === 'success' ? (
              <>
                <Check className="h-5 w-5" />
                <span>Saved!</span>
              </>
            ) : saveStatus === 'error' ? (
              <span>Error</span>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Changes ({selectedIds.size})</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
