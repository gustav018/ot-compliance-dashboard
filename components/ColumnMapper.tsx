import React, { useState, useEffect } from 'react';
import { ColumnMapping } from '../types';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';

interface ColumnMapperProps {
  headers: string[];
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

const ColumnMapper: React.FC<ColumnMapperProps> = ({ headers, onConfirm, onCancel }) => {
  const [mapping, setMapping] = useState<ColumnMapping>({
    otNumber: '',
    folio: '',
    clientCode: '',
    workshop: '',
    promisedDate: '',
    realDeliveryDate: '',
    billingDate: '',
    amount: '',
    otType: '',
    additionalFilters: []
  });

  // Auto-detect columns based on common names
  useEffect(() => {
    const newMapping = { ...mapping };
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('número de ot') || lower.includes('numero de ot')) newMapping.otNumber = h;
      else if (lower.includes('folio') || lower.includes('nrofolio')) newMapping.folio = h;
      else if (lower.includes('código de cliente') || lower.includes('cliente/proveedor')) newMapping.clientCode = h;
      else if (lower.includes('taller') || lower.includes('nombre_taller')) newMapping.workshop = h;
      else if (lower.includes('fecha estimada') || lower.includes('prometida')) newMapping.promisedDate = h;
      else if (lower.includes('entrega real')) newMapping.realDeliveryDate = h;
      else if (lower.includes('contabilización') || lower.includes('factura') || lower.includes('facturación')) newMapping.billingDate = h;
      else if (lower.includes('total gs') || lower.includes('total usd') || lower.includes('importe')) newMapping.amount = h;
      else if (lower.includes('tipoot') || lower.includes('tipo ot') || lower.includes('tipo de ot')) newMapping.otType = h;
    });
    setMapping(newMapping);
  }, [headers]);

  const handleFilterToggle = (header: string) => {
    setMapping(prev => {
      const exists = prev.additionalFilters.includes(header);
      return {
        ...prev,
        additionalFilters: exists 
          ? prev.additionalFilters.filter(f => f !== header)
          : [...prev.additionalFilters, header]
      };
    });
  };

  const isValid = mapping.otNumber && mapping.clientCode && mapping.workshop && mapping.promisedDate && mapping.realDeliveryDate;

  return (
    <div className="max-w-5xl mx-auto mt-8 animate-fade-in pb-12">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Asignación de Columnas</h2>
          <p className="text-sm text-slate-500 mt-1">
            Confirma qué columnas del Excel corresponden a los datos requeridos.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Required Fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Datos Identificación
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Número de OT *</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={mapping.otNumber}
                onChange={(e) => setMapping({...mapping, otNumber: e.target.value})}
              >
                <option value="">Seleccionar columna...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nro Folio (Para duplicados)</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={mapping.folio}
                onChange={(e) => setMapping({...mapping, folio: e.target.value})}
              >
                <option value="">Seleccionar columna (Opcional)</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Código Cliente (Exclusiones) *</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={mapping.clientCode}
                onChange={(e) => setMapping({...mapping, clientCode: e.target.value})}
              >
                <option value="">Seleccionar columna...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nombre Taller *</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={mapping.workshop}
                onChange={(e) => setMapping({...mapping, workshop: e.target.value})}
              >
                <option value="">Seleccionar columna...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Financial & Type Fields */}
          <div className="space-y-4">
             <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Datos Financieros / Tipos
            </h3>

             <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Total / Importe (GS/USD)</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={mapping.amount}
                onChange={(e) => setMapping({...mapping, amount: e.target.value})}
              >
                <option value="">Seleccionar columna (Opcional)</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tipo OT (Para Reclamos)</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={mapping.otType}
                onChange={(e) => setMapping({...mapping, otType: e.target.value})}
              >
                <option value="">Seleccionar columna (Opcional)</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Date Fields & Filters */}
          <div className="space-y-4">
             <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Fechas
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Fecha Prometida / Estimada *</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={mapping.promisedDate}
                onChange={(e) => setMapping({...mapping, promisedDate: e.target.value})}
              >
                <option value="">Seleccionar columna...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Fecha Entrega Real *</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={mapping.realDeliveryDate}
                onChange={(e) => setMapping({...mapping, realDeliveryDate: e.target.value})}
              >
                <option value="">Seleccionar columna...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Fecha Facturación (Opcional)</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={mapping.billingDate}
                onChange={(e) => setMapping({...mapping, billingDate: e.target.value})}
              >
                <option value="">Seleccionar columna...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Filters Section */}
        <div className="p-6 border-t border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700 mb-3">Filtros Adicionales</h3>
            <p className="text-xs text-slate-500 mb-4">Selecciona columnas adicionales para agregar como filtros en el tablero (Ej: Zona, etc.)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
                {headers.map(h => (
                    <label key={h} className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="rounded text-blue-600 focus:ring-blue-500"
                            checked={mapping.additionalFilters.includes(h)}
                            onChange={() => handleFilterToggle(h)}
                        />
                        <span className="text-xs text-slate-700 truncate" title={h}>{h}</span>
                    </label>
                ))}
            </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between items-center">
           <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm"
          >
            Cancelar
          </button>
          
          <div className="flex items-center gap-4">
            {!isValid && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={14} /> Faltan campos obligatorios
              </span>
            )}
            <button
              onClick={() => onConfirm(mapping)}
              disabled={!isValid}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all ${
                isValid 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg' 
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              Procesar Datos
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnMapper;