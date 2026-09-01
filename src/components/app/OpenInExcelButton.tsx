import React from 'react';
import { createExcelUri, openInExcelDesktop, ExcelOpenMode } from '@/lib/excelUri';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, ExternalLink } from 'lucide-react';

interface OpenInExcelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fileUrl: string;
  mode?: ExcelOpenMode;
  label?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  asLink?: boolean;
}

/**
 * OpenInExcelButton Component
 * 
 * Renders an interactive button or hyperlink that redirects the browser to open the hosted 
 * Excel spreadsheet directly in Microsoft Excel Desktop application using native `ms-excel:` protocol.
 */
export const OpenInExcelButton: React.FC<OpenInExcelButtonProps> = ({
  fileUrl,
  mode = 'edit',
  label = 'Open in Excel Desktop',
  variant = 'outline',
  asLink = false,
  className = '',
  ...props
}) => {
  const uri = createExcelUri(fileUrl, mode);

  if (asLink) {
    return (
      <a
        href={uri}
        className={`inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 underline ${className}`}
        target="_self"
        rel="noopener noreferrer"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>{label}</span>
        <ExternalLink className="w-3 h-3 opacity-70" />
      </a>
    );
  }

  return (
    <Button
      variant={variant}
      className={`inline-flex items-center gap-2 ${className}`}
      onClick={() => openInExcelDesktop(fileUrl, mode)}
      {...props}
    >
      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
      <span>{label}</span>
    </Button>
  );
};
