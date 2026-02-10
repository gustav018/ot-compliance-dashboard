import React, { useCallback } from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, isLoading }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          onFileUpload(file);
        } else {
          alert('Por favor sube un archivo Excel válido (.xlsx, .xls)');
        }
      }
    },
    [onFileUpload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className="w-full max-w-2xl mx-auto mt-10 bg-white p-8 rounded-xl shadow-sm border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors cursor-pointer group"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
        <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors mb-4">
            {isLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : (
                <UploadCloud className="w-10 h-10 text-blue-600" />
            )}
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          {isLoading ? 'Procesando...' : 'Cargar archivo Excel'}
        </h3>
        <p className="text-slate-500 text-center mb-6 max-w-sm">
          Arrastra y suelta tu archivo aquí, o haz clic para buscar.
          <br />
          <span className="text-xs text-slate-400">Formatos soportados: .xlsx, .xls</span>
        </p>
        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 px-4 py-2 rounded-lg">
            <FileSpreadsheet size={16} />
            Seleccionar archivo
        </div>
        <input
          id="file-upload"
          type="file"
          accept=".xlsx, .xls"
          className="hidden"
          onChange={handleChange}
          disabled={isLoading}
        />
      </label>
    </div>
  );
};

export default FileUploader;