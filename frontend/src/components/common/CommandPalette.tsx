import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Users,
  Layers,
  ArrowRight,
  X,
  Plus,
  ShieldCheck,
  CreditCard,
  Settings,
  Zap,
} from 'lucide-react';
import { Badge } from './Badge';
import { searchService, type GlobalSearchResults, type SearchResultItem } from '../../services/search.service';
import type { Tenant } from '../../types';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenant?: Tenant;
  onSelectResult: (item: SearchResultItem) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  currentTenant,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResults>({
    invoices: [],
    customers: [],
    transactions: [],
    actions: [],
    totalMatches: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Flattened results list for keyboard arrow navigation
  const flatResults = [
    ...results.actions,
    ...results.invoices,
    ...results.customers,
    ...results.transactions,
  ];

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
      searchService.searchGlobal(currentTenant?.id, '').then(setResults);
    }
  }, [isOpen, currentTenant]);

  // Execute Search on Query Change
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    const timeout = setTimeout(() => {
      searchService
        .searchGlobal(currentTenant?.id, query)
        .then((res) => {
          setResults(res);
          setSelectedIndex(0);
        })
        .finally(() => setIsLoading(false));
    }, 120);

    return () => clearTimeout(timeout);
  }, [query, isOpen, currentTenant]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < flatResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        handleSelectItem(flatResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectItem = (item: SearchResultItem) => {
    onSelectResult(item);
    onClose();
  };

  const getItemIcon = (category: string, title: string) => {
    switch (category) {
      case 'invoice':
        return <FileText className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'customer':
        return <Users className="w-4 h-4 text-sky-600 shrink-0" />;
      case 'transaction':
        return <Layers className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'action':
      default:
        if (title.includes('Invoice')) return <Plus className="w-4 h-4 text-indigo-600 shrink-0" />;
        if (title.includes('Customer')) return <Users className="w-4 h-4 text-sky-600 shrink-0" />;
        if (title.includes('Subscription')) return <Zap className="w-4 h-4 text-amber-600 shrink-0" />;
        if (title.includes('Security')) return <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />;
        if (title.includes('Settings')) return <Settings className="w-4 h-4 text-slate-600 shrink-0" />;
        return <CreditCard className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3">
          <Search className={`w-5 h-5 text-slate-400 shrink-0 ${isLoading ? 'animate-pulse' : ''}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoices, clients, ledger proofs, or jump to..."
            className="w-full text-sm font-medium bg-transparent border-0 focus:outline-hidden placeholder:text-slate-400 text-slate-900"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              aria-label="Close command palette"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 p-2 text-xs">
          {flatResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-semibold text-slate-800 text-sm">No matches found</div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No invoices, customer accounts, or ledger records matched &quot;{query}&quot; in partition{' '}
                <span className="font-mono text-indigo-700">{currentTenant?.databaseName || 'tenant'}</span>.
              </p>
            </div>
          ) : (
            <>
              {/* Group: Invoices */}
              {results.invoices.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Invoices & Billing</span>
                    <span>{results.invoices.length} results</span>
                  </div>
                  {results.invoices.map((item) => {
                    const idx = flatResults.findIndex((x) => x.id === item.id);
                    const isSelected = selectedIndex === idx;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/80 text-indigo-950 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          {getItemIcon(item.category, item.title)}
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 truncate">{item.title}</div>
                            <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <Badge variant={item.badge.variant} size="sm">
                              <span className="capitalize">{item.badge.label}</span>
                            </Badge>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group: Customers */}
              {results.customers.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Customer Accounts</span>
                    <span>{results.customers.length} results</span>
                  </div>
                  {results.customers.map((item) => {
                    const idx = flatResults.findIndex((x) => x.id === item.id);
                    const isSelected = selectedIndex === idx;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/80 text-indigo-950 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          {getItemIcon(item.category, item.title)}
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 truncate">{item.title}</div>
                            <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <Badge variant={item.badge.variant} size="sm">
                              <span className="capitalize">{item.badge.label}</span>
                            </Badge>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono">{item.metadata}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group: Transactions & Ledger */}
              {results.transactions.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Immutable ZK Ledger</span>
                    <span>{results.transactions.length} results</span>
                  </div>
                  {results.transactions.map((item) => {
                    const idx = flatResults.findIndex((x) => x.id === item.id);
                    const isSelected = selectedIndex === idx;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/80 text-indigo-950 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          {getItemIcon(item.category, item.title)}
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 font-mono truncate">{item.title}</div>
                            <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <Badge variant={item.badge.variant} size="sm">
                              <span className="capitalize">{item.badge.label}</span>
                            </Badge>
                          )}
                          <span className="text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {item.metadata}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group: Quick Actions & Routing */}
              {results.actions.length > 0 && (
                <div className="py-1.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Quick Commands & Jump</span>
                    <span>{results.actions.length} commands</span>
                  </div>
                  {results.actions.map((item) => {
                    const idx = flatResults.findIndex((x) => x.id === item.id);
                    const isSelected = selectedIndex === idx;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/80 text-indigo-950 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          {getItemIcon(item.category, item.title)}
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 truncate">{item.title}</div>
                            <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">{item.metadata}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↵</kbd>
              <span>to select</span>
            </span>
          </div>

          <div className="font-mono text-[10px] text-slate-400">
            Tenant partition: {currentTenant?.databaseName || 'isolated_db'}
          </div>
        </div>
      </div>
    </div>
  );
};
