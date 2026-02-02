
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Scissors, Package, 
  FileText, Menu, X, PlusCircle, 
  BarChart3, LineChart as LineIcon,
  TrendingDown, Calendar, CreditCard, Clock,
  Pencil, Save, Trash2, Sun, Moon, Settings,
  PieChart as PieIcon, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  Transaction, TransactionType, Category, ServiceType, 
  Product, ViewType, DateFilter, Theme
} from './types';
import { formatCurrency, filterTransactionsByDate, groupTransactionsByCategory } from './utils';
import { format, parseISO, eachDayOfInterval, subDays, isSameDay, differenceInDays } from 'date-fns';

// --- Constantes ---
const SERVICE_PRICES: Record<string, number> = {
  [ServiceType.CUT]: 25,
  [ServiceType.SCISSOR_CUT]: 30,
  [ServiceType.BEARD]: 20,
  [ServiceType.EYEBROW]: 10,
  [ServiceType.HAIRLINE]: 10,
  [ServiceType.PIGMENTATION]: 25,
  [ServiceType.RELAXING]: 40,
  [ServiceType.CUT_BEARD]: 45,
  [ServiceType.CUT_EYEBROW]: 30,
  [ServiceType.CUT_BEARD_EYEBROW]: 50,
  [ServiceType.CUT_FREESTYLE]: 35,
  [ServiceType.OTHERS]: 0,
};

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// --- Componentes ---

const AppLogo = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <div className={`flex items-center justify-center bg-indigo-600 rounded-lg p-1.5 shadow-lg shadow-indigo-500/20 ${className}`}>
    <Scissors size={size} className="text-white" />
  </div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick, theme }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer touch-manipulation ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]' 
        : `${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`
    }`}
  >
    <Icon size={18} />
    <span className="font-semibold text-sm text-left">{label}</span>
  </button>
);

const Card = ({ children, theme, className = "" }: any) => (
  <div className={`rounded-3xl border p-6 transition-colors duration-300 ${
    theme === 'dark' 
      ? 'bg-slate-900 border-slate-800' 
      : 'bg-white border-slate-100 shadow-sm'
  } ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, color, theme }: any) => (
  <Card theme={theme} className="flex flex-col justify-between hover:scale-[1.02] transition-transform">
    <div className={`p-2 w-fit rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="mt-4">
      <h3 className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{title}</h3>
      <p className={`text-2xl font-black truncate mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  </Card>
);

// --- Componente Principal ---

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      if (typeof window !== 'undefined') {
        return (localStorage.getItem('barberflow-theme') as Theme) || 'light';
      }
    } catch (e) {
      console.warn("LocalStorage access failed", e);
    }
    return 'light';
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('barberflow-transactions-v3');
        return saved ? JSON.parse(saved) : [];
      }
    } catch (e) {
      console.error("Failed to parse transactions", e);
    }
    return [];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('barberflow-products-v3');
        return saved ? JSON.parse(saved) : [];
      }
    } catch (e) {
      console.error("Failed to parse products", e);
    }
    return [];
  });

  const [currentView, setCurrentView] = useState<ViewType>('DASHBOARD');
  const [dateFilter, setDateFilter] = useState<DateFilter>('MONTH');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('barberflow-transactions-v3', JSON.stringify(transactions));
      }
    } catch (e) { /* ignore */ }
  }, [transactions]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('barberflow-products-v3', JSON.stringify(products));
      }
    } catch (e) { /* ignore */ }
  }, [products]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('barberflow-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
    } catch (e) { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isSidebarOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }
  }, [isSidebarOpen]);

  const handleSaveTransaction = (t: Omit<Transaction, 'id'>, id?: string) => {
    if (id) {
      setTransactions(prev => prev.map(item => item.id === id ? { ...t, id } : item));
    } else {
      setTransactions(prev => [{ ...t, id: crypto.randomUUID() }, ...prev]);
    }
    setEditingTransaction(null);
    setCurrentView('STATEMENT');
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Deseja realmente excluir este registro financeiro?')) {
      const transaction = transactions.find(t => t.id === id);
      if (transaction?.relatedId) {
        setProducts(prev => prev.filter(p => p.id !== transaction.relatedId));
      }
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSaveProduct = (p: Omit<Product, 'id'>, id?: string) => {
    if (id) {
      setProducts(prev => prev.map(item => item.id === id ? { ...p, id } : item));
      setTransactions(prev => prev.map(t => t.relatedId === id ? {
        ...t, date: p.purchaseDate, value: p.value, description: `Produto: ${p.name}`
      } : t));
    } else {
      const prodId = crypto.randomUUID();
      setProducts(prev => [{ ...p, id: prodId }, ...prev]);
      setTransactions(prev => [{
        id: crypto.randomUUID(), date: p.purchaseDate, type: TransactionType.EXPENSE,
        category: Category.PRODUCT, value: p.value, description: `Produto: ${p.name}`, relatedId: prodId
      }, ...prev]);
    }
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Ao excluir o produto, a despesa vinculada também será removida. Confirmar?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      setTransactions(prev => prev.filter(t => t.relatedId !== id));
    }
  };

  const filteredData = useMemo(() => filterTransactionsByDate(transactions, dateFilter), [transactions, dateFilter]);
  
  const stats = useMemo(() => {
    const income = filteredData.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.value, 0);
    const expense = filteredData.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.value, 0);
    return { income, expense, profit: income - expense, count: filteredData.length };
  }, [filteredData]);

  const chartDaily = useMemo(() => {
    return eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() }).map(day => {
      const dayStr = format(day, 'dd/MM');
      const val = transactions.filter(t => t.type === TransactionType.INCOME && isSameDay(parseISO(t.date), day)).reduce((s, t) => s + t.value, 0);
      return { name: dayStr, total: val };
    });
  }, [transactions]);

  const pieData = useMemo(() => groupTransactionsByCategory(filteredData), [filteredData]);

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Faturamento" value={formatCurrency(stats.income)} icon={ArrowUpRight} color="bg-emerald-500" theme={theme} />
        <StatCard title="Despesas" value={formatCurrency(stats.expense)} icon={ArrowDownRight} color="bg-rose-500" theme={theme} />
        <StatCard title="Lucro Real" value={formatCurrency(stats.profit)} icon={BarChart3} color="bg-indigo-600" theme={theme} />
        <StatCard title="Atendimentos" value={filteredData.filter(t => t.category === Category.SERVICE).length} icon={Scissors} color="bg-amber-500" theme={theme} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card theme={theme} className="lg:col-span-2 h-80">
          <h3 className={`text-xs font-black uppercase mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            <LineIcon size={14} /> Faturamento Diário (Últimos 7 dias)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDaily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: theme === 'dark' ? '#64748b' : '#94a3b8'}} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                  borderRadius: '12px', 
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
                }} 
              />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} dot={{r: 4, fill: '#6366f1'}} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card theme={theme} className="h-80">
          <h3 className={`text-xs font-black uppercase mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            <PieIcon size={14} /> Serviços Populares
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Mobile Nav */}
      <header className={`md:hidden sticky top-0 z-40 border-b flex items-center justify-between px-6 py-4 backdrop-blur-md ${theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <AppLogo size={16} />
          <h1 className="text-xl font-black tracking-tighter text-indigo-600">BARBER<span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>FLOW</span></h1>
        </div>
        <button type="button" onClick={() => setIsSidebarOpen(true)} className="p-2 cursor-pointer touch-manipulation" aria-label="Abrir menu"><Menu size={24} /></button>
      </header>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r transform transition-transform duration-500 md:relative md:translate-x-0 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <AppLogo size={24} />
              <h1 className="text-2xl font-black tracking-tighter text-indigo-600 italic">BARBERFLOW</h1>
            </div>
            <button type="button" onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 cursor-pointer"><X size={20} /></button>
          </div>
          
          <nav className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
            <SidebarItem icon={LayoutDashboard} label="Relatórios" active={currentView === 'DASHBOARD'} onClick={() => {setCurrentView('DASHBOARD'); setIsSidebarOpen(false)}} theme={theme} />
            <SidebarItem icon={Scissors} label="Novo Atendimento" active={currentView === 'CUT'} onClick={() => {setCurrentView('CUT'); setEditingTransaction(null); setIsSidebarOpen(false)}} theme={theme} />
            <SidebarItem icon={Package} label="Estoque" active={currentView === 'INVENTORY'} onClick={() => {setCurrentView('INVENTORY'); setEditingProduct(null); setIsSidebarOpen(false)}} theme={theme} />
            <SidebarItem icon={TrendingDown} label="Gastos" active={currentView === 'EXPENSES'} onClick={() => {setCurrentView('EXPENSES'); setEditingTransaction(null); setIsSidebarOpen(false)}} theme={theme} />
            <SidebarItem icon={FileText} label="Extrato" active={currentView === 'STATEMENT'} onClick={() => {setCurrentView('STATEMENT'); setIsSidebarOpen(false)}} theme={theme} />
          </nav>

          <div className="mt-auto pt-6 space-y-4">
             <button 
                type="button"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'border-slate-800 bg-slate-800/50 text-amber-400' : 'border-slate-200 bg-slate-50 text-indigo-600'}`}
             >
               {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
               <span className="text-sm font-bold uppercase tracking-wider">{theme === 'light' ? 'Escuro' : 'Claro'}</span>
             </button>
             <div className="pt-4 border-t border-slate-800/20">
                <p className="text-[9px] font-black opacity-30 uppercase tracking-[2px]">Versão 3.0.0</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 md:space-y-10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            {currentView === 'DASHBOARD' ? 'Performance' : 
             currentView === 'CUT' ? 'Atendimento' : 
             currentView === 'INVENTORY' ? 'Estoque' : 
             currentView === 'EXPENSES' ? 'Gastos' : 'Extrato'}
          </h2>

          <div className={`flex items-center gap-1 p-1 rounded-xl w-full md:w-auto overflow-x-auto scrollbar-hide ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200'}`}>
            {(['TOTAL', 'TODAY', 'WEEK', 'MONTH'] as DateFilter[]).map(f => (
              <button type="button" key={f} onClick={() => setDateFilter(f)} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer whitespace-nowrap ${dateFilter === f ? 'bg-indigo-600 text-white shadow-sm' : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:bg-white/50'}`}>
                {f === 'TOTAL' ? 'Tudo' : f === 'TODAY' ? 'Hoje' : f === 'WEEK' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-[500px] pb-24 md:pb-0">
          {currentView === 'DASHBOARD' && renderDashboard()}
          
          {currentView === 'CUT' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <CutForm initial={editingTransaction} onSave={handleSaveTransaction} theme={theme} />
            </div>
          )}

          {currentView === 'INVENTORY' && (
            <InventoryModule products={products} initial={editingProduct} onSave={handleSaveProduct} onDelete={handleDeleteProduct} theme={theme} />
          )}

          {currentView === 'EXPENSES' && (
             <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4">
               <ExpenseForm initial={editingTransaction} onSave={handleSaveTransaction} theme={theme} />
             </div>
          )}

          {currentView === 'STATEMENT' && (
            <Card theme={theme} className="overflow-hidden p-0 animate-in fade-in">
               <div className="overflow-x-auto scrollbar-hide">
                 <table className="w-full text-left table-auto">
                    <thead className={`text-[10px] font-black uppercase ${theme === 'dark' ? 'bg-slate-800/50 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                      <tr>
                        <th className="px-4 md:px-6 py-5 whitespace-nowrap">Data</th>
                        <th className="px-4 md:px-6 py-5">Descrição</th>
                        <th className="px-4 md:px-6 py-5">Categoria</th>
                        <th className="px-4 md:px-6 py-5 text-right whitespace-nowrap">Valor</th>
                        <th className="px-4 md:px-6 py-5 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/10">
                      {filteredData.length > 0 ? filteredData.map(t => (
                        <tr key={t.id} className="hover:bg-indigo-50/5 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 md:px-6 py-5 text-xs font-bold opacity-50 whitespace-nowrap">{format(parseISO(t.date), 'dd/MM/yy')}</td>
                          <td className="px-4 md:px-6 py-5">
                            <div className="font-bold text-sm leading-tight">{t.description}</div>
                            {t.customerName && <div className="text-[10px] opacity-40 uppercase tracking-wider">{t.customerName}</div>}
                          </td>
                          <td className="px-4 md:px-6 py-5">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase whitespace-nowrap ${t.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{t.category}</span>
                          </td>
                          <td className={`px-4 md:px-6 py-5 text-right font-black whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.value)}
                          </td>
                          <td className="px-4 md:px-6 py-5">
                            <div className="flex items-center justify-center gap-1 md:gap-2">
                              <button type="button" onClick={() => {setEditingTransaction(t); setCurrentView(t.category === Category.SERVICE ? 'CUT' : 'EXPENSES')}} className="p-3 md:p-2 hover:bg-indigo-500/10 text-indigo-500 rounded-lg cursor-pointer transition-colors" aria-label="Editar"><Pencil size={16} /></button>
                              <button type="button" onClick={() => handleDeleteTransaction(t.id)} className="p-3 md:p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg cursor-pointer transition-colors" aria-label="Excluir"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="px-6 py-10 text-center text-sm opacity-40 italic">Nenhum registro encontrado.</td></tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </Card>
          )}

          {/* Fallback de segurança */}
          {!['DASHBOARD', 'CUT', 'INVENTORY', 'EXPENSES', 'STATEMENT'].includes(currentView) && renderDashboard()}
        </div>

        {currentView !== 'CUT' && (
          <button 
            type="button"
            onClick={() => {setEditingTransaction(null); setCurrentView('CUT');}} 
            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 cursor-pointer touch-manipulation"
            aria-label="Novo Atendimento"
          >
            <PlusCircle size={32} />
          </button>
        )}
      </main>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden animate-in fade-in transition-opacity" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
    </div>
  );
}

// --- Subcomponentes de Formulário ---

const CutForm = ({ initial, onSave, theme }: any) => {
  const [data, setData] = useState({
    customer: initial?.customerName || '',
    date: initial?.date || format(new Date(), 'yyyy-MM-dd'),
    service: initial?.description || ServiceType.CUT,
    value: initial?.value || SERVICE_PRICES[ServiceType.CUT],
    notes: initial?.notes || ''
  });

  const handleChange = (service: string) => {
    setData(prev => ({ 
      ...prev, 
      service, 
      value: service !== 'Outros' ? SERVICE_PRICES[service as ServiceType] : prev.value 
    }));
  };

  return (
    <Card theme={theme} className="space-y-6">
      <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Scissors className="text-indigo-600" /> Detalhes do Corte</h2>
      <form onSubmit={(e) => { e.preventDefault(); onSave({
        date: data.date, type: TransactionType.INCOME, category: Category.SERVICE,
        value: Number(data.value), description: data.service, customerName: data.customer, notes: data.notes
      }, initial?.id); }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold opacity-40 uppercase ml-1">Nome do Cliente</label>
            <input required value={data.customer} onChange={e => setData({...data, customer: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none border transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold opacity-40 uppercase ml-1">Data</label>
            <input type="date" required value={data.date} onChange={e => setData({...data, date: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold opacity-40 uppercase ml-1">Serviço</label>
            <select value={data.service} onChange={e => handleChange(e.target.value)} className={`w-full px-4 py-3 rounded-xl outline-none border cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              {Object.values(ServiceType).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold opacity-40 uppercase ml-1">Valor (R$)</label>
            <input type="number" step="0.01" required value={data.value} onChange={e => setData({...data, value: Number(e.target.value)})} className={`w-full px-4 py-3 rounded-xl outline-none border font-black ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold opacity-40 uppercase ml-1">Observações Extras</label>
          <textarea placeholder="Ex: Cabelo muito comprido, desconto de R$ 5..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none border min-h-[100px] resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`} />
        </div>
        <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]">
          <Save size={18} /> {initial ? 'Atualizar Atendimento' : 'Salvar Atendimento'}
        </button>
      </form>
    </Card>
  );
};

const ExpenseForm = ({ initial, onSave, theme }: any) => {
  const [data, setData] = useState({
    desc: initial?.description || '',
    val: initial?.value || '',
    date: initial?.date || format(new Date(), 'yyyy-MM-dd'),
    cat: initial?.category || Category.GENERAL_EXPENSE
  });

  return (
    <Card theme={theme} className="space-y-4">
      <h2 className="text-xl font-black mb-4 flex items-center gap-2"><TrendingDown className="text-rose-500" /> Registro de Gasto</h2>
      <form onSubmit={(e) => { e.preventDefault(); onSave({
        date: data.date, type: TransactionType.EXPENSE, category: data.cat,
        value: Number(data.val), description: data.desc
      }, initial?.id); }} className="space-y-4">
        <input required placeholder="Ex: Aluguel, Conta de Luz..." value={data.desc} onChange={e => setData({...data, desc: e.target.value})} className={`w-full px-4 py-3 rounded-xl border outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:border-rose-500'}`} />
        <div className="grid grid-cols-2 gap-4">
          <input type="number" step="0.01" required placeholder="Valor" value={data.val} onChange={e => setData({...data, val: e.target.value})} className={`px-4 py-3 rounded-xl border outline-none font-bold text-rose-500 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
          <input type="date" required value={data.date} onChange={e => setData({...data, date: e.target.value})} className={`px-4 py-3 rounded-xl border outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
        </div>
        <select value={data.cat} onChange={e => setData({...data, cat: e.target.value as Category})} className={`w-full px-4 py-3 rounded-xl border outline-none cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <option value={Category.GENERAL_EXPENSE}>Despesa Geral</option>
          <option value={Category.MAINTENANCE}>Manutenção</option>
          <option value={Category.RENT}>Aluguel</option>
          <option value={Category.VARIABLE_EXPENSE}>Despesa Variável</option>
        </select>
        <button type="submit" className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]">
          <Save size={18} /> {initial ? 'Atualizar Gasto' : 'Salvar Gasto'}
        </button>
      </form>
    </Card>
  );
};

const InventoryModule = ({ products, initial, onSave, onDelete, theme }: any) => {
  const [data, setData] = useState({
    name: initial?.name || '',
    val: initial?.value || '',
    date: initial?.purchaseDate || format(new Date(), 'yyyy-MM-dd'),
    end: initial?.endDate || ''
  });

  useEffect(() => {
    if(initial) setData({ name: initial.name, val: initial.value, date: initial.purchaseDate, end: initial.endDate || '' });
  }, [initial]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <Card theme={theme} className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Package className="text-indigo-600" /> Gestão de Estoque</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave({
          name: data.name, value: Number(data.val), purchaseDate: data.date, endDate: data.end || undefined
        }, initial?.id); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Produto" value={data.name} onChange={e => setData({...data, name: e.target.value})} className={`px-4 py-3 rounded-xl border outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`} />
            <input type="number" step="0.01" required placeholder="Custo" value={data.val} onChange={e => setData({...data, val: e.target.value})} className={`px-4 py-3 rounded-xl border outline-none font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
            <div className="space-y-1">
               <label className="text-[10px] font-bold opacity-30 uppercase ml-1">Data da Compra</label>
               <input type="date" required value={data.date} onChange={e => setData({...data, date: e.target.value})} className={`w-full px-4 py-3 rounded-xl border outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-bold opacity-30 uppercase ml-1">Data de Término (Opcional)</label>
               <input type="date" value={data.end} onChange={e => setData({...data, end: e.target.value})} className={`w-full px-4 py-3 rounded-xl border outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]">
            <Save size={18} /> {initial ? 'Atualizar Produto' : 'Adicionar ao Estoque'}
          </button>
        </form>
      </Card>

      {!initial && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p: any) => {
            const dur = p.endDate ? differenceInDays(parseISO(p.endDate), parseISO(p.purchaseDate)) : null;
            return (
              <Card key={p.id} theme={theme} className="relative group hover:border-indigo-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Package size={18} /></div>
                   <div className="flex gap-1">
                      <button type="button" onClick={() => onSave(p, p.id)} className="p-3 md:p-2 hover:bg-indigo-500/10 text-indigo-500 rounded-lg cursor-pointer transition-colors" aria-label="Editar"><Pencil size={14} /></button>
                      <button type="button" onClick={() => onDelete(p.id)} className="p-3 md:p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg cursor-pointer transition-colors" aria-label="Excluir"><Trash2 size={14} /></button>
                   </div>
                </div>
                <h4 className="font-black text-lg">{p.name}</h4>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase opacity-40"><span>Custo</span> <span>Duração</span></div>
                  <div className="flex justify-between font-black">
                    <span className="text-rose-500">{formatCurrency(p.value)}</span>
                    <span className="text-indigo-500">{dur !== null ? `${dur} dias` : 'Em uso'}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
