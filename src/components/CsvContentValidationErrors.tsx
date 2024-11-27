import React from 'react';
import { cn } from "@/lib/utils";

interface ValidationErrorDetails {
  row_number: number;
  field: string | null;
  error_type: string;
  error_message: string;
}

interface CsvContentValidationErrorsProps {
  errors: ValidationErrorDetails[];
}

export const CsvContentValidationErrors: React.FC<CsvContentValidationErrorsProps> = ({ errors }) => {
  const contentErrors = errors.filter(error => error.row_number > 0);

  if (contentErrors.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-red-200 bg-white">
      <div className="border-b border-red-200 bg-red-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-red-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="font-bold text-red-500">CSV Content Validation Issues Detected</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Row</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Field</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Error Type</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Error Message</th>
            </tr>
          </thead>
          <tbody>
            {contentErrors.slice(0, 10).map((error, index) => (
              <tr
                key={index}
                className={cn(
                  "border-b border-gray-200",
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                )}
              >
                <td className="px-4 py-2 text-sm text-red-500">{error.row_number}</td>
                <td className="px-4 py-2 text-sm text-red-500">{error.field || 'N/A'}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{error.error_type}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{error.error_message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {contentErrors.length > 10 && (
          <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
            ... and {contentErrors.length - 10} more errors
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvContentValidationErrors;