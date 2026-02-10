import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, PieChart, Pie
} from 'recharts';
import { ParsedOT, WorkshopStats, ColumnMapping, ProcessingReport } from '../types';
import { calculateStats } from '../utils/excelHelpers';
import { CheckCircle, AlertTriangle, Clock, Activity, Filter, Calendar, Wrench, ListFilter, Users, ShieldAlert, DollarSign, AlertCircle, Box, CreditCard, LayoutList, Download } from 'lucide-react';
import AuditModal from './AuditModal';

interface DashboardProps {
  uniqueOTs: ParsedOT[]; // For Compliance
  allRows: ParsedOT[]; // For Financials
  onReset: () => void;
  fileName?: string;
  sheetName?: string;
  mapping: ColumnMapping;
  report?: ProcessingReport;
}

const COLORS = {
    onTime: '#22c55e', // green-500
    late: '#ef4444',   // red-500
    pending: '#eab308' // yellow-500
};

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Helper for formatting currency
const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-PY', { style: 'currency', currency: 'PYG' }).replace('PYG', 'Gs');
};

const Dashboard: React.FC<DashboardProps> = ({ uniqueOTs, allRows, onReset, fileName, sheetName, mapping, report }) => {
  
  // -- GLOBAL FILTERS (Date & Workshop) apply to both tabs --
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allRows.forEach(ot => {
      if (ot.billingDate && ot.billingDate instanceof Date && !isNaN(ot.billingDate.getTime())) {
        years.add(ot.billingDate.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allRows]);

  const availableWorkshops = useMemo(() => {
    const workshops = new Set<string>();
    allRows.forEach(ot => workshops.add(ot.workshop));
    return Array.from(workshops).sort();
  }, [allRows]);

  const dynamicFilterOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    mapping.additionalFilters.forEach(field => {
      options[field] = new Set<string>();
    });
    
    allRows.forEach(ot => {
      mapping.additionalFilters.forEach(field => {
        const val = ot.customValues[field];
        if (val) options[field].add(val);
      });
    });

    const result: Record<string, string[]> = {};
    Object.keys(options).forEach(key => {
      result[key] = Array.from(options[key]).sort();
    });
    return result;
  }, [allRows, mapping.additionalFilters]);

  // State
  const [activeTab, setActiveTab] = useState<'compliance' | 'financial'>('compliance');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('all');
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);

  // Common Filter Function
  const checkFilters = (ot: ParsedOT) => {
      // Date Filter
      let dateMatch = true;
      if (selectedYear !== 'all') {
         if (!ot.billingDate) {
            dateMatch = false;
         } else {
            const yearMatch = ot.billingDate.getFullYear().toString() === selectedYear;
            const monthMatch = selectedMonth === 'all' || ot.billingDate.getMonth().toString() === selectedMonth;
            dateMatch = yearMatch && monthMatch;
         }
      }
      // Workshop Filter
      const workshopMatch = selectedWorkshop === 'all' || ot.workshop === selectedWorkshop;
      // Dynamic Filters
      let dynamicMatch = true;
      for (const [field, value] of Object.entries(dynamicFilters)) {
        if (value !== 'all' && ot.customValues[field] !== value) {
          dynamicMatch = false;
          break;
        }
      }
      return dateMatch && workshopMatch && dynamicMatch;
  };

  // --- INDICATOR 1: COMPLIANCE LOGIC (Unique OTs) ---
  const complianceData = useMemo(() => {
      return uniqueOTs.filter(ot => {
          // EXCLUDE Internal Clients hardcoded
          if (['C0008157', 'C0001114', 'C0001140'].includes(ot.clientCode)) return false;
          // Apply common filters
          return checkFilters(ot);
      });
  }, [uniqueOTs, selectedYear, selectedMonth, selectedWorkshop, dynamicFilters]);

  const complianceStats = useMemo(() => calculateStats(complianceData), [complianceData]);

  // --- INDICATOR 2: FINANCIAL LOGIC (All Rows) ---
  const financialData = useMemo(() => {
      return allRows.filter(ot => {
          // EXCLUDE Internal Clients hardcoded
          if (['C0008157', 'C0001114', 'C0001140'].includes(ot.clientCode)) return false;
          return checkFilters(ot);
      });
  }, [allRows, selectedYear, selectedMonth, selectedWorkshop, dynamicFilters]);

  const financialTotal = useMemo(() => financialData.reduce((sum, item) => sum + item.amount, 0), [financialData]);
  const financialCount = financialData.length;

  // --- CLAIMS LOGIC (Specific Client + OT Type) ---
  const claimsData = useMemo(() => {
      return allRows.filter(ot => {
          // Validacion estricta: Cliente C0008157 Y Tipo OT contiene "Reclamo"
          const isClientMatch = ot.clientCode === 'C0008157';
          const isTypeMatch = ot.otType && ot.otType.toLowerCase().includes('reclamo');
          
          if (!isClientMatch || !isTypeMatch) return false;
          
          return checkFilters(ot);
      });
  }, [allRows, selectedYear, selectedMonth, selectedWorkshop, dynamicFilters]);

  const claimsTotalAmount = useMemo(() => claimsData.reduce((sum, item) => sum + item.amount, 0), [claimsData]);
  const claimsCount = claimsData.length; // Raw rows
  const claimsUniqueOTs = new Set(claimsData.map(c => c.id)).size;

  const pieData = [
    { name: 'A Tiempo', value: complianceStats.totalOnTime, color: COLORS.onTime },
    { name: 'Retraso', value: complianceStats.totalLate, color: COLORS.late },
    { name: 'Pendiente', value: complianceStats.totalPending, color: COLORS.pending },
  ];

  const handleDownload = (type: 'compliance' | 'financial' | 'claims') => {
    let data: ParsedOT[] = [];
    let sheetTitle = '';

    if (type === 'compliance') {
        data = complianceData;
        sheetTitle = 'Reporte_Logistica';
    } else if (type === 'financial') {
        data = financialData;
        sheetTitle = 'Reporte_Financiero';
    } else {
        data = claimsData;
        sheetTitle = 'Reporte_Reclamos';
    }
    
    const formattedData = data.map(ot => ({
        'Nro OT': ot.id,
        'Taller': ot.workshop,
        'Cliente': ot.clientCode,
        'Tipo OT': ot.otType || '',
        'Folio': ot.folio || '',
        'Factura': ot.invoiceId || '',
        'Fecha Estimada': ot.estimatedDate ? ot.estimatedDate.toLocaleDateString('es-PY') : '',
        'Fecha Real': ot.realDate ? ot.realDate.toLocaleDateString('es-PY') : '',
        'Fecha Facturación': ot.billingDate ? ot.billingDate.toLocaleDateString('es-PY') : '',
        'Importe': ot.amount,
        'Estado': (!ot.realDate && !ot.estimatedDate) ? 'Sin Fecha' :
                  (ot.realDate && ot.estimatedDate && ot.realDate <= ot.estimatedDate) ? 'A Tiempo' :
                  (!ot.realDate) ? 'Pendiente' : 'Retraso',
         ...ot.customValues
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    XLSX.writeFile(wb, `${fileName?.replace(/\.[^/.]+$/, "") || 'Reporte'}_${sheetTitle}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {report && (
        <AuditModal 
            report={report} 
            isOpen={isAuditOpen} 
            onClose={() => setIsAuditOpen(false)} 
        />
      )}

      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
              <h2 className="text-xl font-bold text-slate-800">Tablero de Control</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{fileName}</span>
                <span className="font-medium text-blue-600">{sheetName}</span>
              </div>
          </div>
          <div className="flex gap-3 flex-wrap">
             {report && (
                <button
                    onClick={() => setIsAuditOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                >
                    <ShieldAlert size={16} className="text-orange-500" />
                    Auditoría
                </button>
             )}
             <button 
                onClick={onReset}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
                Cargar nuevo archivo
            </button>
          </div>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Filter size={18} />
            <span>Filtros Globales:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 flex items-center gap-1"><Calendar size={14} /> Año:</label>
            <select 
              className="form-select text-sm border-slate-300 rounded-md shadow-sm focus:border-blue-500 bg-white py-1.5 px-3 border"
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); if (e.target.value === 'all') setSelectedMonth('all'); }}
            >
              <option value="all">Todos</option>
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Mes:</label>
            <select 
              className="form-select text-sm border-slate-300 rounded-md shadow-sm focus:border-blue-500 bg-white py-1.5 px-3 border"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={selectedYear === 'all'}
            >
              <option value="all">Todos</option>
              {MONTH_NAMES.map((month, idx) => <option key={idx} value={idx}>{month}</option>)}
            </select>
          </div>

           <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
            <label className="text-sm text-slate-600 flex items-center gap-1"><Wrench size={14} /> Taller:</label>
            <select 
              className="form-select text-sm border-slate-300 rounded-md shadow-sm focus:border-blue-500 bg-white py-1.5 px-3 border"
              value={selectedWorkshop}
              onChange={(e) => setSelectedWorkshop(e.target.value)}
            >
              <option value="all">Todos</option>
              {availableWorkshops.map(ws => <option key={ws} value={ws}>{ws}</option>)}
            </select>
          </div>

          {mapping.additionalFilters.length > 0 && (
             <div className="flex items-center gap-4 border-l border-slate-200 pl-4 ml-2 flex-wrap">
                {mapping.additionalFilters.map(field => (
                  <div key={field} className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 flex items-center gap-1"><ListFilter size={14} /> {field}:</label>
                    <select
                      className="form-select text-sm border-slate-300 rounded-md shadow-sm bg-white py-1.5 px-3 border max-w-[150px]"
                      value={dynamicFilters[field] || 'all'}
                      onChange={(e) => setDynamicFilters({ ...dynamicFilters, [field]: e.target.value })}
                    >
                      <option value="all">Todos</option>
                      {dynamicFilterOptions[field]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
             </div>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('compliance')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'compliance' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Box size={18} />
            Logística y Cumplimiento (Ind. 1)
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'financial' 
                ? 'border-b-2 border-green-600 text-green-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard size={18} />
            Financiero y Facturación (Ind. 2)
          </button>
      </div>

      {/* --- TAB CONTENT: COMPLIANCE --- */}
      {activeTab === 'compliance' && (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                <Box className="text-blue-600 mt-1" size={20} />
                <div className="text-sm text-blue-800">
                    <strong>Datos Filtrados para Logística:</strong> Se han eliminado duplicados de OT (1 registro por OT) y excluido clientes internos (C0008157, C0001114, C0001140).
                    Datos basados en <strong>{complianceData.length}</strong> OTs únicas.
                </div>
             </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase">Total OTs Únicas</span>
                    <div className="text-3xl font-bold text-slate-900 mt-2">{complianceStats.totalOTs}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-green-600 uppercase">A Tiempo</span>
                    <div className="text-3xl font-bold text-slate-900 mt-2">{complianceStats.totalOnTime}</div>
                    <div className="text-sm text-green-600 font-medium">{complianceStats.averageCompliance}%</div>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-red-600 uppercase">Con Retraso</span>
                    <div className="text-3xl font-bold text-slate-900 mt-2">{complianceStats.totalLate}</div>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-yellow-600 uppercase">Pendientes / Sin Fecha</span>
                    <div className="text-3xl font-bold text-slate-900 mt-2">{complianceStats.totalPending}</div>
                    <div className="text-xs text-slate-400 mt-1">Alertas de fecha</div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                     <h3 className="text-lg font-semibold text-slate-800 mb-4">Cumplimiento por Taller</h3>
                     <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={complianceStats.workshops}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                <Tooltip cursor={{fill: '#f1f5f9'}} />
                                <Legend />
                                <Bar dataKey="onTime" name="A Tiempo" stackId="a" fill={COLORS.onTime} />
                                <Bar dataKey="late" name="Tardío" stackId="a" fill={COLORS.late} />
                                <Bar dataKey="pending" name="Pendiente" stackId="a" fill={COLORS.pending} />
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2 w-full">Distribución</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer>
                             <PieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* DATA TABLE FOR COMPLIANCE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <LayoutList size={18} /> Detalle de OTs Procesadas (Únicas)
                     </h3>
                     <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">Mostrando {complianceData.length} registros</span>
                        <button 
                            onClick={() => handleDownload('compliance')}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                        >
                            <Download size={14} /> Exportar Excel
                        </button>
                     </div>
                </div>
                <div className="overflow-auto max-h-96">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2">Nro OT</th>
                                <th className="px-4 py-2">Taller</th>
                                <th className="px-4 py-2">Cliente</th>
                                <th className="px-4 py-2 text-right">Prometida</th>
                                <th className="px-4 py-2 text-right">Real</th>
                                <th className="px-4 py-2 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {complianceData.slice(0, 100).map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium">{row.id}</td>
                                    <td className="px-4 py-2">{row.workshop}</td>
                                    <td className="px-4 py-2 text-xs text-slate-500">{row.clientCode}</td>
                                    <td className="px-4 py-2 text-right">{row.estimatedDate?.toLocaleDateString()}</td>
                                    <td className="px-4 py-2 text-right">{row.realDate?.toLocaleDateString() || '-'}</td>
                                    <td className="px-4 py-2 text-center">
                                        {(!row.realDate && !row.estimatedDate) ? <span className="text-yellow-600">⚠ Sin Fecha</span> :
                                         (row.realDate && row.estimatedDate && row.realDate <= row.estimatedDate) ? <span className="text-green-600 font-bold">OK</span> :
                                         (!row.realDate) ? <span className="text-yellow-600">Pendiente</span> :
                                         <span className="text-red-600 font-bold">Retraso</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                            {complianceData.length > 100 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-2 text-center text-slate-500 italic">
                                        ... y {complianceData.length - 100} registros más
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* --- TAB CONTENT: FINANCIAL --- */}
      {activeTab === 'financial' && (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex items-start gap-3">
                <CreditCard className="text-green-600 mt-1" size={20} />
                <div className="text-sm text-green-800">
                    <strong>Datos Filtrados para Finanzas:</strong> Se incluyen todas las facturas/filas (permitiendo duplicados de OT si tienen diferente facturación). Se excluyen clientes internos.
                    Datos basados en <strong>{financialCount}</strong> registros.
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Financial KPI */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} className="text-green-600" /></div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Facturación Total (Sin Internos)</span>
                    <div className="text-4xl font-bold text-slate-900 mt-2">{formatCurrency(financialTotal)}</div>
                    <div className="mt-2 text-sm text-slate-500">{financialCount} transacciones procesadas</div>
                </div>

                {/* Claims KPI */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-orange-500 border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="text-orange-500" size={20} />
                            <h3 className="font-bold text-slate-800">Reclamos (C0008157 + Tipo Reclamo)</h3>
                        </div>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                        <div>
                            <div className="text-3xl font-bold text-slate-900">{formatCurrency(claimsTotalAmount)}</div>
                            <div className="text-sm text-slate-500 mt-1">Total Importe Reclamos</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-slate-800">{claimsUniqueOTs}</div>
                            <div className="text-xs text-slate-500">OTs Únicas</div>
                            <div className="text-xs text-slate-400">({claimsCount} registros)</div>
                        </div>
                    </div>
                </div>
             </div>
             
             {/* DATA TABLE FOR CLAIMS */}
             {claimsData.length > 0 && (
                 <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-orange-500 border-slate-100 overflow-hidden mb-6">
                    <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                         <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <AlertCircle size={18} className="text-orange-600"/> Detalle de Reclamos Detectados
                         </h3>
                         <div className="flex items-center gap-3">
                             <span className="text-xs text-slate-500">Mostrando {claimsData.length} registros</span>
                             <button 
                                onClick={() => handleDownload('claims')}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-orange-700 bg-white hover:bg-orange-50 border border-orange-200 rounded-md transition-colors"
                            >
                                <Download size={14} /> Exportar Reclamos
                            </button>
                         </div>
                    </div>
                    <div className="overflow-auto max-h-[400px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2">Nro OT</th>
                                    <th className="px-4 py-2">Taller</th>
                                    <th className="px-4 py-2">Tipo OT</th>
                                    <th className="px-4 py-2 text-right">Fecha Fact.</th>
                                    <th className="px-4 py-2 text-right">Importe</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {claimsData.slice(0, 500).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium">{row.id}</td>
                                        <td className="px-4 py-2">{row.workshop}</td>
                                        <td className="px-4 py-2 text-xs font-medium"><span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full inline-block">{row.otType}</span></td>
                                        <td className="px-4 py-2 text-right">{row.billingDate?.toLocaleDateString() || '-'}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-700">
                                            {formatCurrency(row.amount)}
                                        </td>
                                    </tr>
                                ))}
                                {claimsData.length > 500 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-2 text-center text-slate-500 italic">
                                            ... y {claimsData.length - 500} registros más
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
             )}

             {/* DATA TABLE FOR FINANCIALS */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <LayoutList size={18} /> Detalle de Facturación (Todos los registros)
                     </h3>
                     <div className="flex items-center gap-3">
                         <span className="text-xs text-slate-500">Mostrando {financialData.length} registros</span>
                         <button 
                            onClick={() => handleDownload('financial')}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors"
                        >
                            <Download size={14} /> Exportar Excel
                        </button>
                     </div>
                </div>
                <div className="overflow-auto max-h-[500px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2">Nro OT</th>
                                <th className="px-4 py-2">Cliente</th>
                                <th className="px-4 py-2">Factura / Folio</th>
                                <th className="px-4 py-2">Taller</th>
                                <th className="px-4 py-2 text-right">Fecha Fact.</th>
                                <th className="px-4 py-2 text-right">Importe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {financialData.slice(0, 100).map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium">{row.id}</td>
                                    <td className="px-4 py-2 text-xs text-slate-500">{row.clientCode}</td>
                                    <td className="px-4 py-2 text-xs">{row.invoiceId || row.folio || '-'}</td>
                                    <td className="px-4 py-2">{row.workshop}</td>
                                    <td className="px-4 py-2 text-right">{row.billingDate?.toLocaleDateString() || '-'}</td>
                                    <td className="px-4 py-2 text-right font-mono text-slate-700">
                                        {formatCurrency(row.amount)}
                                    </td>
                                </tr>
                            ))}
                            {financialData.length > 100 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-2 text-center text-slate-500 italic">
                                        ... y {financialData.length - 100} registros más
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;