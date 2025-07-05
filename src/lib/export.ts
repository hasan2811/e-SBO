
'use client';

import * as XLSX from 'xlsx';
import type { Observation, Inspection, Ptw, AllItems } from './types';
import { format } from 'date-fns';

export const exportToExcel = (items: AllItems[], fileName: string): boolean => {
  if (items.length === 0) {
    return false;
  }

  const observations = items.filter(item => item.itemType === 'observation') as Observation[];
  const inspections = items.filter(item => item.itemType === 'inspection') as Inspection[];
  const ptws = items.filter(item => item.itemType === 'ptw') as Ptw[];

  const wb = XLSX.utils.book_new();

  // 1. Process Observations
  if (observations.length > 0) {
    const obsData = observations.map(obs => ({
      'Reference ID': obs.referenceId || obs.id,
      'Date': obs.date ? format(new Date(obs.date), 'yyyy-MM-dd HH:mm') : '',
      'Submitted By': obs.submittedBy,
      'Company': obs.company,
      'Location': obs.location,
      'Category': obs.category,
      'Status': obs.status,
      'Risk Level': obs.riskLevel,
      'Findings': obs.findings,
      'Recommendation': obs.recommendation,
      'Photo URL': obs.photoUrl || '',
      'Action Taken': obs.actionTakenDescription || '',
      'Closed By': obs.closedBy || '',
      'Closed Date': obs.closedDate ? format(new Date(obs.closedDate), 'yyyy-MM-dd HH:mm') : '',
      'Action Photo URL': obs.actionTakenPhotoUrl || '',
      'AI Summary': obs.aiSummary || '',
      'AI Risks': obs.aiRisks || '',
      'AI Suggested Actions': obs.aiSuggestedActions || '',
      'AI Regulations': obs.aiRelevantRegulations || '',
      'AI Suggested Risk': obs.aiSuggestedRiskLevel || '',
      'AI Root Cause': obs.aiRootCauseAnalysis || '',
      'AI Observer Rating': obs.aiObserverSkillRating || '',
      'AI Observer Explanation': obs.aiObserverSkillExplanation || '',
    }));
    const obsSheet = XLSX.utils.json_to_sheet(obsData);
    obsSheet['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 50 }, { wch: 50 },
        { wch: 50 }, { wch: 50 }, { wch: 25 }, { wch: 18 }, { wch: 50 },
        { wch: 50 }, { wch: 50 }, { wch: 50 }, { wch: 50 }, { wch: 15 },
        { wch: 50 }, { wch: 15 }, { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, obsSheet, 'Observations');
  }

  // 2. Process Inspections
  if (inspections.length > 0) {
    const inspData = inspections.map(insp => ({
      'Reference ID': insp.referenceId || insp.id,
      'Date': insp.date ? format(new Date(insp.date), 'yyyy-MM-dd HH:mm') : '',
      'Submitted By': insp.submittedBy,
      'Location': insp.location,
      'Equipment Name': insp.equipmentName,
      'Equipment Type': insp.equipmentType,
      'Status': insp.status,
      'Findings': insp.findings,
      'Recommendation': insp.recommendation || '',
      'Photo URL': insp.photoUrl || '',
      'Action Taken': insp.actionTakenDescription || '',
      'Closed By': insp.closedBy || '',
      'Closed Date': insp.closedDate ? format(new Date(insp.closedDate), 'yyyy-MM-dd HH:mm') : '',
      'Action Photo URL': insp.actionTakenPhotoUrl || '',
      'AI Summary': insp.aiSummary || '',
      'AI Risks': insp.aiRisks || '',
      'AI Suggested Actions': insp.aiSuggestedActions || '',
    }));
    const inspSheet = XLSX.utils.json_to_sheet(inspData);
    inspSheet['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 25 },
        { wch: 20 }, { wch: 15 }, { wch: 50 }, { wch: 50 }, { wch: 50 },
        { wch: 50 }, { wch: 25 }, { wch: 18 }, { wch: 50 }, { wch: 50 },
        { wch: 50 }, { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, inspSheet, 'Inspections');
  }

  // 3. Process PTWs
  if (ptws.length > 0) {
    const ptwData = ptws.map(ptw => ({
      'Reference ID': ptw.referenceId || ptw.id,
      'Date': ptw.date ? format(new Date(ptw.date), 'yyyy-MM-dd HH:mm') : '',
      'Submitted By': ptw.submittedBy,
      'Location': ptw.location,
      'Contractor': ptw.contractor,
      'Work Description': ptw.workDescription,
      'Status': ptw.status,
      'JSA PDF URL': ptw.jsaPdfUrl,
      'Stamped JSA PDF URL': ptw.stampedPdfUrl || '',
      'Approver': ptw.approver || '',
      'Approved Date': ptw.approvedDate ? format(new Date(ptw.approvedDate), 'yyyy-MM-dd HH:mm') : '',
    }));
    const ptwSheet = XLSX.utils.json_to_sheet(ptwData);
    ptwSheet['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 25 },
        { wch: 50 }, { wch: 20 }, { wch: 50 }, { wch: 50 }, { wch: 25 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ptwSheet, 'PTW');
  }
  
  // Only write file if at least one sheet was created
  if (wb.SheetNames.length > 0) {
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    return true; // Indicate success
  } else {
    return false; // No data to export
  }
};
