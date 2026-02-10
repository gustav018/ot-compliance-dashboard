import React, { useState } from 'react';
import { ProcessingReport } from '../types';
import { X, ShieldCheck, FileText, AlertTriangle, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface AuditModalProps {
  report: ProcessingReport;
  isOpen: boolean;
  onClose: () => void;
}

const AuditModal: React.FC<AuditModalProps> = ({ report, isOpen, onClose }) => {
  const [showDeletedList, setShowDeletedList] = useState(false);

  if (!isOpen) return null;

  const validRows = report.totalRows - report.emptyRows - report.duplicatesRemovedForCompliance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden m-4 border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <ShieldCheck size={20} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800">Auditoría de Procesamiento</h3>
                <p className="text-xs text-slate-500">Transparencia en la lógica de datos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <span className="block text-2xl font-bold text-slate-800">{report.totalRows}</span>
                    <span className="text-xs text-slate-500 font-medium">Filas Leídas</span>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                    <span className="block text-2xl font-bold text-red-600">-{report.duplicatesRemovedForCompliance}</span>
                    <span className="text-xs text-red-600 font-medium">Duplicados</span>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                    <span className="block text-2xl font-bold text-green-600">{validRows}</span>
                    <span className="text-xs text-green-600 font-medium">Filas Únicas</span>
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Logic Explanation Sections */}
            
            {/* Duplicates */}
            <div className="flex gap-4 items-start">
                <div className="mt-1 flex-shrink-0">
                    <Trash2 className="text-orange-500" size={20} />
                </div>
                <div className="w-full">
                    <h4 className="font-semibold text-slate-800">Eliminación de Duplicados</h4>
                    <p className="text-sm text-slate-600 mt-1">
                        Se detectaron <strong>{report.duplicatesRemovedForCompliance}</strong> conflictos de OT.
                        Se priorizó clientes externos sobre internos.
                    </p>
                    
                    {report.removedOtIds.length > 0 && (
                        <div className="mt-3">
                            <button 
                                onClick={() => setShowDeletedList(!showDeletedList)}
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                {showDeletedList ? <ChevronUp size={14}/> : <ChevronDown size={14} />}
                                {showDeletedList ? 'Ocultar lista de eliminados' : 'Ver lista de eliminados'}
                            </button>
                            
                            {showDeletedList && (
                                <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 max-h-32 overflow-y-auto font-mono">
                                    {report.removedOtIds.map((id, idx) => (
                                        <div key={idx} className="border-b border-slate-100 last:border-0 py-1">
                                            {id}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Internal Clients */}
            <div className="flex gap-4">
                <div className="mt-1 flex-shrink-0">
                    <Users className="text-blue-500" size={20} />
                </div>
                <div>
                    <h4 className="font-semibold text-slate-800">Clientes Internos Detectados</h4>
                    <p className="text-sm text-slate-600 mt-1">
                        Existen <strong>{report.internalClientsCount}</strong> registros de códigos internos en los datos actuales.
                        El código <strong>C0008157</strong> se utiliza para identificación de Reclamos.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(report.internalClientsByCode).map(([code, count]) => (
                            <span key={code} className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                {code}: {count}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

             {/* Empty Rows */}
             {report.emptyRows > 0 && (
                <div className="flex gap-4">
                    <div className="mt-1 flex-shrink-0">
                        <AlertTriangle className="text-slate-400" size={20} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800">Filas Vacías</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            <strong>{report.emptyRows}</strong> filas ignoradas sin número de OT.
                        </p>
                    </div>
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-right">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
                Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};

export default AuditModal;