/**
 * Utility functions for opening Excel files directly in the Microsoft Excel Desktop App
 * using Microsoft Office URI Schemes (ms-excel:).
 *
 * Documentation: https://learn.microsoft.com/en-us/office/client-developer/office-uri-schemes
 */

export type ExcelOpenMode = 'edit' | 'view' | 'default';

/**
 * Constructs an ms-excel: URI scheme URL for opening hosted Excel spreadsheets in Desktop Excel.
 * 
 * @param fileUrl The full HTTP or HTTPS URL to the .xlsx/.xls file hosted online (e.g. Supabase Storage / SharePoint / AWS S3)
 * @param mode 'edit' (ofe = Open for Edit), 'view' (ofv = Open for View), or 'default'
 * @returns The formatted ms-excel URI string
 */
export function createExcelUri(fileUrl: string, mode: ExcelOpenMode = 'default'): string {
  if (!fileUrl) return '';

  // Ensure URL uses http or https scheme as required by MS Office protocol handler
  const trimmedUrl = fileUrl.trim();
  
  switch (mode) {
    case 'edit':
      return `ms-excel:ofe|u|${trimmedUrl}`;
    case 'view':
      return `ms-excel:ofv|u|${trimmedUrl}`;
    case 'default':
    default:
      return `ms-excel:${trimmedUrl}`;
  }
}

/**
 * Programmatically triggers the browser to open an online Excel file directly in desktop Excel app.
 * 
 * @param fileUrl Direct HTTP/HTTPS URL of the hosted spreadsheet
 * @param mode 'edit', 'view', or 'default'
 */
export function openInExcelDesktop(fileUrl: string, mode: ExcelOpenMode = 'edit'): void {
  const uri = createExcelUri(fileUrl, mode);
  if (uri && typeof window !== 'undefined') {
    window.location.href = uri;
  }
}
