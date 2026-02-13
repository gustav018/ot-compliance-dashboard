import * as XLSX from 'xlsx';
import { ExcelRow, GlobalStats, WorkshopStats, ParsedOT, ColumnMapping, ProcessingReport, ProcessResult } from '../types';

const INTERNAL_CLIENT_CODES = ['C0008157', 'C0001114', 'C0001140'];

// Helper to convert Excel date serial number to JS Date
const parseExcelDate = (dateVal: any): Date | null => {
  if (dateVal === null || dateVal === undefined || dateVal === '') return null;
  
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }

  if (typeof dateVal === 'number') {
    const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;

    if (!isNaN(Number(trimmed)) && !trimmed.includes('/') && !trimmed.includes('-') && !trimmed.includes(':')) {
       const date = new Date(Math.round((Number(trimmed) - 25569) * 86400 * 1000));
       return isNaN(date.getTime()) ? null : date;
    }

    const latamDate = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (latamDate) {
      const day = parseInt(latamDate[1], 10);
      const month = parseInt(latamDate[2], 10) - 1;
      const year = parseInt(latamDate[3], 10);
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }
    
    const isoDate = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoDate) {
       const year = parseInt(isoDate[1], 10);
       const month = parseInt(isoDate[2], 10) - 1;
       const day = parseInt(isoDate[3], 10);
       const date = new Date(year, month, day);
       return isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
};

const parseAmount = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export const loadWorkbook = (file: File): Promise<{ workbook: XLSX.WorkBook; sheetNames: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        resolve({ workbook, sheetNames: workbook.SheetNames });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const getSheetHeaders = (workbook: XLSX.WorkBook, sheetName: string): string[] => {
  const sheet = workbook.Sheets[sheetName];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data && data.length > 0) {
    return data[0].map(h => String(h).trim()).filter(h => h !== '');
  }
  return [];
};

export const processSheet = (workbook: XLSX.WorkBook, sheetName: string, mapping: ColumnMapping): ProcessResult => {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet);
  
  const allRows: ParsedOT[] = [];
  const otMapForCompliance = new Map<string, ParsedOT>();

  let totalRows = 0;
  let emptyRows = 0;
  let duplicatesRemovedForCompliance = 0;
  const removedOtIds: string[] = [];

  jsonData.forEach((row) => {
    totalRows++;

    const otNumber = String(row[mapping.otNumber] || '').trim();
    if (!otNumber) {
        emptyRows++;
        return; 
    }

    const clientCode = String(row[mapping.clientCode] || '').trim();
    const folio = mapping.folio ? String(row[mapping.folio] || '').trim() : '';
    const workshopName = String(row[mapping.workshop] || 'Sin Taller Asignado').trim();
    const amount = mapping.amount ? parseAmount(row[mapping.amount]) : 0;
    const otType = mapping.otType ? String(row[mapping.otType] || '').trim() : 'N/A';
    const invoiceId = mapping.invoiceNumber ? String(row[mapping.invoiceNumber] || '').trim() : undefined;
    
    const isInternal = INTERNAL_CLIENT_CODES.includes(clientCode);
    const estimatedDate = parseExcelDate(row[mapping.promisedDate]);
    // Parse second date if mapped
    const secondEstimatedDate = mapping.secondPromisedDate ? parseExcelDate(row[mapping.secondPromisedDate]) : null;
    
    const realDate = parseExcelDate(row[mapping.realDeliveryDate]);
    const billingDate = mapping.billingDate ? parseExcelDate(row[mapping.billingDate]) : null;

    const customValues: Record<string, string> = {};
    mapping.additionalFilters.forEach(field => {
      customValues[field] = String(row[field] || 'N/A').trim();
    });

    const parsedRow: ParsedOT = {
      id: otNumber,
      invoiceId,
      folio,
      workshop: workshopName || 'Sin Taller',
      estimatedDate,
      secondEstimatedDate,
      realDate,
      billingDate,
      status: 'Procesado',
      clientCode,
      isInternalClient: isInternal,
      amount,
      otType,
      customValues
    };

    // 1. Add to All Rows (For Financials - assumes one row per invoice/line item)
    allRows.push(parsedRow);

    // 2. Logic for Compliance (Unique OTs)
    if (otMapForCompliance.has(otNumber)) {
        duplicatesRemovedForCompliance++;
        const existingOT = otMapForCompliance.get(otNumber)!;

        // Priority Logic for Compliance Data:
        if (existingOT.isInternalClient && !parsedRow.isInternalClient) {
            removedOtIds.push(`${existingOT.id} (Reemplazado interno por externo)`);
            otMapForCompliance.set(otNumber, parsedRow);
        } else if (!existingOT.isInternalClient && parsedRow.isInternalClient) {
             removedOtIds.push(`${parsedRow.id} (Duplicado interno ignorado)`);
        } else {
            // Tie-breaker: If new row has a Real Date and existing doesn't, take new.
            if (!existingOT.realDate && parsedRow.realDate) {
                 removedOtIds.push(`${existingOT.id} (Reemplazado por registro con fecha entrega)`);
                 otMapForCompliance.set(otNumber, parsedRow);
            } else {
                removedOtIds.push(`${parsedRow.id} (Duplicado ignorado)`);
            }
        }
    } else {
        otMapForCompliance.set(otNumber, parsedRow);
    }
  });

  const uniqueOTs = Array.from(otMapForCompliance.values());

  const internalClientsByCode: Record<string, number> = {};
  let internalClientsCount = 0;
  
  allRows.forEach(ot => {
    if (ot.isInternalClient) {
        internalClientsCount++;
        internalClientsByCode[ot.clientCode] = (internalClientsByCode[ot.clientCode] || 0) + 1;
    }
  });

  return {
    allRows,
    uniqueOTs,
    report: {
        totalRows,
        emptyRows,
        duplicatesRemovedForCompliance,
        removedOtIds,
        internalClientsCount,
        internalClientsByCode
    }
  };
};

export const calculateStats = (ots: ParsedOT[]): GlobalStats => {
  const workshopMap = new Map<string, { total: number; onTime: number; late: number; pending: number; amount: number }>();

  let globalTotal = 0;
  let globalOnTime = 0;
  let globalLate = 0;
  let globalPending = 0;
  let globalAmount = 0;

  ots.forEach((ot) => {
    globalAmount += ot.amount;
    
    if (!workshopMap.has(ot.workshop)) {
      workshopMap.set(ot.workshop, { total: 0, onTime: 0, late: 0, pending: 0, amount: 0 });
    }

    const stats = workshopMap.get(ot.workshop)!;
    stats.total++;
    stats.amount += ot.amount;
    globalTotal++;

    // LOGIC UPDATE: Use secondEstimatedDate if available, otherwise estimatedDate
    const targetDate = ot.secondEstimatedDate || ot.estimatedDate;

    if (ot.realDate && targetDate) {
      const target = new Date(targetDate);
      const real = new Date(ot.realDate);
      target.setHours(0, 0, 0, 0);
      real.setHours(0, 0, 0, 0);

      if (real <= target) {
        stats.onTime++;
        globalOnTime++;
      } else {
        stats.late++;
        globalLate++;
      }
    } else if (targetDate && !ot.realDate) {
      // Has target date but no real date -> Pending (or potentially late if today > target, but classified as Pending delivery)
      stats.pending++;
      globalPending++;
    } else {
      // No target date at all
      stats.pending++;
      globalPending++;
    }
  });

  const workshops: WorkshopStats[] = [];
  workshopMap.forEach((val, key) => {
    const complianceRate = val.total > 0 ? (val.onTime / val.total) * 100 : 0;
    
    workshops.push({
      name: key,
      totalOTs: val.total,
      onTime: val.onTime,
      late: val.late,
      pending: val.pending,
      complianceRate: parseFloat(complianceRate.toFixed(2)),
      totalAmount: val.amount
    });
  });

  workshops.sort((a, b) => b.totalOTs - a.totalOTs);

  const averageCompliance = globalTotal > 0 ? (globalOnTime / globalTotal) * 100 : 0;

  return {
    totalOTs: globalTotal,
    totalOnTime: globalOnTime,
    totalLate: globalLate,
    totalPending: globalPending,
    averageCompliance: parseFloat(averageCompliance.toFixed(2)),
    totalAmount: globalAmount,
    workshops
  };
};