'use client';

import * as XLSX from 'xlsx';
import type { Observation } from './types';
import { format } from 'date-fns';

export const exportToExcel = (observations: Observation[], fileName: string) => {
  if (observations.length === 0) {
    return false; // Indicate failure
  }

  // Map observations to a simpler format for the sheet with user-friendly headers
  const dataToExport = observations.map(obs => ({
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

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Observations');

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 20 }, // Reference ID
    { wch: 18 }, // Date
    { wch: 25 }, // Submitted By
    { wch: 15 }, // Company
    { wch: 15 }, // Location
    { wch: 15 }, // Category
    { wch: 15 }, // Status
    { wch: 15 }, // Risk Level
    { wch: 50 }, // Findings
    { wch: 50 }, // Recommendation
    { wch: 50 }, // Photo URL
    { wch: 50 }, // Action Taken
    { wch: 25 }, // Closed By
    { wch: 18 }, // Closed Date
    { wch: 50 }, // Action Photo URL
    { wch: 50 }, // AI Summary
    { wch: 50 }, // AI Risks
    { wch: 50 }, // AI Suggested Actions
    { wch: 50 }, // AI Regulations
    { wch: 15 }, // AI Suggested Risk
    { wch: 50 }, // AI Root Cause
    { wch: 15 }, // AI Observer Rating
    { wch: 50 }, // AI Observer Explanation
  ];

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
  return true; // Indicate success
};
