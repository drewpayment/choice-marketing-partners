'use client';

import { WorksheetInfo } from '@/lib/excel-import/parser';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface WorksheetSelectorProps {
  worksheets: WorksheetInfo[];
  fileName: string;
  onSelect: (worksheetName: string) => void;
  onCancel: () => void;
}

export default function WorksheetSelector({
  worksheets,
  fileName,
  onSelect,
  onCancel
}: WorksheetSelectorProps) {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(
    worksheets.length === 1 ? worksheets[0].name : null
  );

  const handleConfirm = () => {
    if (selectedSheet) {
      onSelect(selectedSheet);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Worksheet</h3>
        <p className="text-sm text-muted-foreground">
          The file <span className="font-medium">{fileName}</span> contains multiple worksheets. 
          Please select which worksheet you want to import.
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Worksheet Name</TableHead>
              <TableHead className="text-right">Data Rows</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {worksheets.map((worksheet) => {
              const isSelected = selectedSheet === worksheet.name;
              
              return (
                <TableRow
                  key={worksheet.name}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedSheet(worksheet.name)}
                >
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                      <span className={`font-medium ${
                        isSelected ? 'text-blue-900' : ''
                      }`}>
                        {worksheet.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm text-muted-foreground">
                      {worksheet.rowCount.toLocaleString()} {worksheet.rowCount === 1 ? 'row' : 'rows'}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {worksheets.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Select the worksheet that contains your sales data. 
            The row count shows the number of data rows (excluding the header).
          </p>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedSheet ? (
            <span>Selected: <span className="font-medium">{selectedSheet}</span></span>
          ) : (
            <span>No worksheet selected</span>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedSheet}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
