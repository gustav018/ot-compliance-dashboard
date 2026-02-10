import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ParsedOT, ColumnMapping, ProcessingReport } from './types';
import { loadWorkbook, processSheet, getSheetHeaders } from './utils/excelHelpers';
import FileUploader from './components/FileUploader';
import ColumnMapper from './components/ColumnMapper';
import Dashboard from './components/Dashboard';
import { LayoutDashboard, Github, Table as TableIcon } from 'lucide-react';

const App: React.FC = () => {
  // State for flow control
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  // Mapping State
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);

  // State for Data
  const [allRows, setAllRows] = useState<ParsedOT[] | null>(null);
  const [uniqueOTs, setUniqueOTs] = useState<ParsedOT[] | null>(null);
  const [processingReport, setProcessingReport] = useState<ProcessingReport | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    try {
      const { workbook: wb, sheetNames: sheets } = await loadWorkbook(file);
      setWorkbook(wb);
      setSheetNames(sheets);

      if (sheets.length === 1) {
        selectSheetForMapping(wb, sheets[0]);
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Error leyendo el archivo. Verifica que sea un Excel válido.");
    } finally {
      setLoading(false);
    }
  };

  const selectSheetForMapping = (wb: XLSX.WorkBook, name: string) => {
    setSelectedSheet(name);
    const headers = getSheetHeaders(wb, name);
    setSheetHeaders(headers);
  };

  const handleSheetSelection = (name: string) => {
    if (workbook) {
      selectSheetForMapping(workbook, name);
    }
  };

  const handleMappingConfirm = (map: ColumnMapping) => {
    if (workbook && selectedSheet) {
      setLoading(true);
      try {
        const result = processSheet(workbook, selectedSheet, map);
        setAllRows(result.allRows);
        setUniqueOTs(result.uniqueOTs);
        setProcessingReport(result.report);
        setMapping(map);
      } catch (err) {
        console.error(err);
        setError("Error procesando los datos. Revisa la asignación de columnas.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReset = () => {
    setAllRows(null);
    setUniqueOTs(null);
    setProcessingReport(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet(null);
    setMapping(null);
    setFileName('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-200">
                <LayoutDashboard size={24} />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                OT Analytics
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 hidden sm:inline-block">v1.4.0</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!workbook && !loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Sube tu Reporte de Órdenes de Trabajo</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Analiza el cumplimiento logístico y financiero. El sistema separa OTs únicas para KPIs de cumplimiento y utiliza la facturación completa para reportes financieros.
              </p>
            </div>
            <FileUploader onFileUpload={handleFileUpload} isLoading={loading} />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-sm text-slate-500 max-w-4xl">
              <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-100">
                <span className="block font-semibold text-slate-700 mb-1">Doble Enfoque</span>
                Indicadores separados para Logística (OTs únicas) y Finanzas (Total facturado).
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-100">
                <span className="block font-semibold text-slate-700 mb-1">Gestión de Reclamos</span>
                Identificación automática de reclamos (C0008157) con reportes específicos.
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-100">
                <span className="block font-semibold text-slate-700 mb-1">Auditoría Transparente</span>
                Tablas detalladas para visualizar datos excluidos y procesados.
              </div>
            </div>
          </div>
        )}

        {workbook && !selectedSheet && (
          <div className="max-w-2xl mx-auto mt-12 animate-fade-in">
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <TableIcon className="text-blue-600" />
                  Selecciona una Hoja
                </h2>
                <p className="text-sm text-slate-500 mt-1">El archivo contiene múltiples hojas. Elige cual analizar.</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-3">
                  {sheetNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleSheetSelection(name)}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                    >
                      <span className="font-medium text-slate-700 group-hover:text-blue-700">{name}</span>
                      <span className="text-slate-400 group-hover:text-blue-500 text-sm">Analizar →</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleReset}
                  className="mt-6 text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  Cancelar y subir otro archivo
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedSheet && !uniqueOTs && (
          <ColumnMapper
            headers={sheetHeaders}
            onConfirm={handleMappingConfirm}
            onCancel={() => setSelectedSheet(null)}
          />
        )}

        {allRows && uniqueOTs && mapping && (
          <Dashboard
            uniqueOTs={uniqueOTs}
            allRows={allRows}
            report={processingReport || undefined}
            onReset={handleReset}
            fileName={fileName}
            sheetName={selectedSheet || ''}
            mapping={mapping}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Dashboard de Operaciones. Procesamiento local seguro. Los datos no son alacenados.
          </p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">
              <Github size={20} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;