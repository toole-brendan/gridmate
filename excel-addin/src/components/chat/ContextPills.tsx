import React from 'react';
import { FileSpreadsheet, AlertTriangle, Grid3x3 } from 'lucide-react';
import { ExcelService } from '../../services/excel/ExcelService';

interface ContextPill {
  type: 'sheet' | 'range' | 'workbook';
  value: string;
  truncated?: boolean;
  warning?: string;
  onClick?: () => void;
}

interface ContextPillsProps {
  pills: ContextPill[];
}

export const ContextPill: React.FC<{ pill: ContextPill }> = ({ pill }) => {
  const excelService = ExcelService.getInstance();
  
  const handleClick = async () => {
    if (pill.onClick) {
      pill.onClick();
    } else if (pill.type === 'range') {
      // Navigate to range
      try {
        await Excel.run(async (context) => {
          const range = context.workbook.worksheets.getActiveWorksheet().getRange(pill.value);
          range.select();
          await context.sync();
        });
      } catch (error) {
        console.error('Failed to navigate to range:', error);
      }
    } else if (pill.type === 'sheet') {
      // Navigate to sheet
      try {
        await Excel.run(async (context) => {
          const sheet = context.workbook.worksheets.getItem(pill.value);
          sheet.activate();
          await context.sync();
        });
      } catch (error) {
        console.error('Failed to navigate to sheet:', error);
      }
    }
  };

  const getIcon = () => {
    switch (pill.type) {
      case 'sheet':
        return <FileSpreadsheet size={14} />;
      case 'range':
        return <Grid3x3 size={14} />;
      default:
        return null;
    }
  };

  return (
    <button
      className={`context-pill inline-flex items-center space-x-1 px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
        pill.truncated ? 'border border-yellow-400' : ''
      }`}
      onClick={handleClick}
      title={pill.warning}
    >
      {getIcon()}
      <span>{pill.value}</span>
      {pill.truncated && (
        <AlertTriangle size={12} className="text-yellow-500" />
      )}
    </button>
  );
};

export const ContextPills: React.FC<ContextPillsProps> = ({ pills }) => {
  if (pills.length === 0) return null;
  
  return (
    <div className="context-pills flex flex-wrap gap-1 mt-1">
      {pills.map((pill, index) => (
        <ContextPill key={index} pill={pill} />
      ))}
    </div>
  );
};