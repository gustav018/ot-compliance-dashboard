export interface ExcelRow {
  [key: string]: any;
}

export interface ColumnMapping {
  otNumber: string;
  folio: string;
  clientCode: string;
  workshop: string;
  promisedDate: string; // Fecha Estimada Original
  secondPromisedDate?: string; // Segunda Fecha Estimada (Opcional)
  realDeliveryDate: string; // Fecha Entrega Real
  billingDate?: string; // Fecha de facturacion (optional)
  amount: string; // Columna de Importe/Total
  otType: string; // Tipo de OT (para detectar Reclamos)
  invoiceNumber?: string; // Numero de Factura (para unicidad en financiero)
  additionalFilters: string[]; // Fields to add as filters
}

export interface ParsedOT {
  id: string; // OT Number
  invoiceId?: string; // Invoice Number
  folio: string;
  workshop: string;
  estimatedDate: Date | null;
  secondEstimatedDate: Date | null; // Nueva lógica: Fecha reprogramada
  realDate: Date | null;
  billingDate: Date | null;
  status: string;
  clientCode: string;
  clientName?: string;
  isInternalClient: boolean; // Flag for internal clients (C0008157, etc.)
  amount: number; // Importe
  otType: string; // Tipo (Normal, Reclamo, etc.)
  customValues: Record<string, string>;
}

export interface ProcessingReport {
  totalRows: number;
  emptyRows: number;
  duplicatesRemovedForCompliance: number; // Duplicates removed to get unique OTs
  removedOtIds: string[]; // List of specific OTs removed as duplicates
  internalClientsCount: number; // In the final dataset
  internalClientsByCode: Record<string, number>; // Breakdown
}

export interface ProcessResult {
    allRows: ParsedOT[]; // For Financial Indicator (Includes multiple invoices per OT)
    uniqueOTs: ParsedOT[]; // For Compliance Indicator (Unique OT IDs)
    report: ProcessingReport;
}

export interface WorkshopStats {
  name: string;
  totalOTs: number;
  onTime: number;
  late: number;
  pending: number;
  complianceRate: number; // Percentage
  totalAmount: number;
}

export interface GlobalStats {
  totalOTs: number;
  totalOnTime: number;
  totalLate: number;
  totalPending: number;
  averageCompliance: number;
  totalAmount: number; // Sum of amounts
  workshops: WorkshopStats[];
}