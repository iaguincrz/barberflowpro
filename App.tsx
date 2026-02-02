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

// --- Utilitários ---
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

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

export default function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('DASHBOARD');
  const [dateFilter, setDateFilter] = useState<DateFilter>('MONTH');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Carregamento inicial (apenas no cliente)
  useEffect(() => {
    const loadData = () => {
      try {
        const savedTheme = localStorage.getItem('barberflow-theme') as Theme;
        if (savedTheme) {
          setTheme(savedTheme);
          if (savedTheme === 'dark') document.documentElement.classList.add('dark');
        }

        const savedT = localStorage.getItem('barberflow-transactions-v3');
        if (savedT) setTransactions(JSON.parse(savedT));

        const savedP = localStorage.getItem('barberflow-products-v3');
        if (savedP) setProducts(JSON.parse(savedP));
      } catch (e) {
        console.warn("Local storage error:", e);
      }
    };
    
    // Pequeno delay para garantir que o DOM esteja estável
    setTimeout(loadData, 50);
  }, []);

  // Persistência
  useEffect(() => {
    if (transactions.length > 0) localStorage.setItem('barberflow-transactions-v3', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (products.length > 0) localStorage.setItem('barberflow-products-v3', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('barberflow-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const handleSaveTransaction = (t: Omit<Transaction, 'id'>, id?: string) => {
    if (id) {
      setTransactions(prev => prev.map(item => item.id === id ? { ...t, id } : item));
    } else {
      setTransactions(prev => [{ ...t, id: generateId() }, ...prev]);
    }
    setEditingTransaction(null);
    setCurrentView('STATEMENT');
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Deseja realmente excluir este registro?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const filteredData = useMemo(() => filterTransactionsByDate(transactions, dateFilter), [transactions, dateFilter]);
  
  const stats = useMemo(() => {
    const income = filteredData.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.value, 0);
    const expense = filteredData.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.value, 0);
    return { income, expense, profit: income - expense };
  }, [filteredData]);

  const chartDaily = useMemo(() => {
    try {
      return eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() }).map(day => {
        const dayStr = format(day, 'dd/MM');
        const val = transactions
          .filter(t => t.type === TransactionType.INCOME && isSameDay(parseISO(t.date), day))
          .reduce((s, t) => s + t.value, 0);
        return { name: dayStr, total: val };
      });
    } catch (e) { return []; }
  }, [transactions]);

  const pieData = useMemo(() => groupTransactionsByCategory(filteredData), [filteredData]);

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Faturamento" value={formatCurrency(stats.income)} icon={ArrowUpRight} color="bg-emerald-500" theme={theme} />
        <StatCard title="Despesas" value={formatCurrency(stats.expense)} icon={ArrowDownRight} color="bg-rose-500" theme={theme} />
        <StatCard title="Lucro Real" value={formatCurrency(stats.profit)} icon={BarChart3} color="bg-indigo-600" theme={theme} />
        <StatCard title="Atendimentos" value={filteredData.filter(t => t.category === Category.SERVICE).length} icon={Scissors} color="bg-amber-500" theme={theme} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card theme={theme} className="lg:col-span-2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDaily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card theme={theme} className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="md:hidden border-b p-4 flex justify-between items-center bg-white dark:bg-slate-900">
        <h1 className="font-black text-indigo-600">BARBERFLOW</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu /></button>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-6 h-full flex flex-col">
          <h1 className="text-xl font-black mb-10 text-indigo-600">BARBERFLOW</h1>
          <nav className="flex-1 space-y-1">
            <button onClick={() => {setCurrentView('DASHBOARD'); setIsSidebarOpen(false)}} className={`w-full text-left p-3 rounded-lg ${currentView === 'DASHBOARD' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Dashboard</button>
            <button onClick={() => {setCurrentView('CUT'); setIsSidebarOpen(false)}} className={`w-full text-left p-3 rounded-lg ${currentView === 'CUT' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Novo Corte</button>
            <button onClick={() => {setCurrentView('STATEMENT'); setIsSidebarOpen(false)}} className={`w-full text-left p-3 rounded-lg ${currentView === 'STATEMENT' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Extrato</button>
          </nav>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-3 border rounded-lg mt-4">
            {theme === 'light' ? <Moon className="inline mr-2" size={16}/> : <Sun className="inline mr-2" size={16}/>}
            {theme === 'light' ? 'Escuro' : 'Claro'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <h2 className="text-3xl font-black mb-8">{currentView}</h2>
        {currentView === 'DASHBOARD' && renderDashboard()}
        {currentView === 'CUT' && <div className="max-w-xl mx-auto"><CutForm onSave={handleSaveTransaction} theme={theme} /></div>}
        {currentView === 'STATEMENT' && (
          <Card theme={theme} className="overflow-hidden p-0">
             <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4">Valor</th>
                    <th className="p-4">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(t => (
                    <tr key={t.id} className="border-t dark:border-slate-800">
                      <td className="p-4 text-xs">{format(parseISO(t.date), 'dd/MM/yy')}</td>
                      <td className="p-4 font-bold">{t.description}</td>
                      <td className={`p-4 font-black ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(t.value)}
                      </td>
                      <td className="p-4"><button onClick={() => handleDeleteTransaction(t.id)} className="text-rose-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </Card>
        )}
      </main>
    </div>
  );
}

const Card = ({ children, theme, className = "" }: any) => (
  <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, color, theme }: any) => (
  <Card theme={theme}>
    <div className={`h-1 w-8 rounded-full mb-4 ${color}`} />
    <h3 className="text-[10px] font-bold uppercase opacity-50">{title}</h3>
    <p className="text-xl font-black">{value}</p>
  </Card>
);

const CutForm = ({ onSave, theme }: any) => {
  const [data, setData] = useState({
    customer: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    service: ServiceType.CUT,
    value: SERVICE_PRICES[ServiceType.CUT]
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({
      date: data.date, type: TransactionType.INCOME, category: Category.SERVICE,
      value: Number(data.value), description: data.service, customerName: data.customer
    }); }} className="space-y-4">
      <input required placeholder="Nome do Cliente" value={data.customer} onChange={e => setData({...data, customer: e.target.value})} className="w-full p-4 rounded-xl border dark:bg-slate-900 dark:border-slate-800" />
      <select value={data.service} onChange={e => setData({...data, service: e.target.value as ServiceType, value: SERVICE_PRICES[e.target.value as ServiceType] || data.value})} className="w-full p-4 rounded-xl border dark:bg-slate-900 dark:border-slate-800">
        {Object.values(ServiceType).map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input type="number" required value={data.value} onChange={e => setData({...data, value: Number(e.target.value)})} className="w-full p-4 rounded-xl border dark:bg-slate-900 dark:border-slate-800" />
      <button type="submit" className="w-full p-4 bg-indigo-600 text-white rounded-xl font-bold">Salvar Atendimento</button>
    </form>
  );
};