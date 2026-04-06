import { useState, useRef } from 'react';
import { Download, Upload, FileText, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { TestCase, TestCaseExport } from '@/types';
import { format } from 'date-fns';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCases: TestCase[];
  suites: { id: string; name: string }[];
  projectId?: string;
  onImport: (cases: Partial<TestCase>[]) => void;
}

// Sample template for download
const SAMPLE_TEMPLATE: TestCaseExport[] = [
  {
    id: '',
    title: 'Sample Test Case 1',
    description: 'This is a sample test case description',
    preconditions: 'User must be logged in',
    steps: '1. Navigate to homepage|2. Click on login button|3. Enter credentials',
    expectedResult: 'User is successfully logged in',
    priority: 'high',
    type: 'manual',
    suite: 'Authentication',
    tags: 'login,auth,smoke',
  },
  {
    id: '',
    title: 'Sample Test Case 2',
    description: 'Another sample test case',
    preconditions: '',
    steps: '1. Open settings page|2. Change theme to dark',
    expectedResult: 'Theme is changed to dark mode',
    priority: 'medium',
    type: 'manual',
    suite: 'User Profile',
    tags: 'settings,theme',
  },
];

export const ImportExportDialog = ({
  open,
  onOpenChange,
  testCases,
  suites,
  projectId,
  onImport,
}: ImportExportDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedData, setImportedData] = useState<TestCaseExport[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const csv = generateCSV(SAMPLE_TEMPLATE);
    downloadFile(csv, 'test-case-template.csv', 'text/csv');
    toast.success('Template downloaded successfully');
  };

  const downloadJSON = () => {
    const json = JSON.stringify(SAMPLE_TEMPLATE, null, 2);
    downloadFile(json, 'test-case-template.json', 'application/json');
    toast.success('JSON template downloaded successfully');
  };

  const exportTestCases = (formatType: 'csv' | 'json') => {
    const exportData: TestCaseExport[] = testCases.map(tc => ({
      id: tc.id,
      title: tc.title,
      description: tc.description,
      preconditions: tc.preconditions || '',
      steps: tc.steps.map((s, i) => `${i + 1}. ${s.action}`).join('|'),
      expectedResult: tc.expectedResult,
      priority: tc.priority,
      type: tc.type,
      suite: suites.find(s => s.id === tc.suiteId)?.name || '',
      tags: tc.tags.join(','),
    }));

    if (formatType === 'csv') {
      const csv = generateCSV(exportData);
      downloadFile(csv, `test-cases-export-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
    } else {
      const json = JSON.stringify(exportData, null, 2);
      downloadFile(json, `test-cases-export-${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json');
    }
    toast.success(`Exported ${exportData.length} test cases`);
  };

  const generateCSV = (data: TestCaseExport[]): string => {
    const headers = ['ID', 'Title', 'Description', 'Preconditions', 'Steps', 'Expected Result', 'Priority', 'Type', 'Suite', 'Tags'];
    const rows = data.map(row => [
      row.id,
      row.title,
      row.description,
      row.preconditions,
      row.steps,
      row.expectedResult,
      row.priority,
      row.type,
      row.suite,
      row.tags,
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let parsed: TestCaseExport[] = [];

        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          parsed = parseCSV(content);
        } else {
          throw new Error('Unsupported file format. Please use CSV or JSON.');
        }

        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('No valid test cases found in file.');
        }

        setImportedData(parsed);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to parse file');
        setImportedData([]);
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read file');
    };

    reader.readAsText(file);
  };

  const parseCSV = (content: string): TestCaseExport[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV file must have headers and at least one data row');

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const titleIndex = headers.findIndex(h => h === 'title');
    if (titleIndex === -1) throw new Error('CSV must have a "Title" column');

    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      return {
        id: values[headers.indexOf('id')] || '',
        title: values[titleIndex] || '',
        description: values[headers.indexOf('description')] || '',
        preconditions: values[headers.indexOf('preconditions')] || '',
        steps: values[headers.indexOf('steps')] || '',
        expectedResult: values[headers.indexOf('expected result')] || values[headers.indexOf('expectedresult')] || '',
        priority: values[headers.indexOf('priority')] || 'medium',
        type: values[headers.indexOf('type')] || 'manual',
        suite: values[headers.indexOf('suite')] || '',
        tags: values[headers.indexOf('tags')] || '',
      };
    }).filter(tc => tc.title);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleImport = async () => {
    if (importedData.length === 0) return;

    setImporting(true);
    try {
      const testCasesToImport: Partial<TestCase>[] = importedData.map(tc => {
        // Find suite by name or use first suite
        const suite = suites.find(s => s.name.toLowerCase() === tc.suite.toLowerCase());
        const suiteId = suite?.id || suites[0]?.id;

        // Parse steps
        const stepStrings = tc.steps.split('|').filter(s => s.trim());
        const steps = stepStrings.map((stepText, idx) => {
          // Remove numbering if present (e.g., "1. Navigate to...")
          const cleanStep = stepText.replace(/^\d+\.\s*/, '').trim();
          return {
            id: String(idx + 1),
            order: idx + 1,
            action: cleanStep,
            expectedResult: '',
          };
        });

        return {
          title: tc.title,
          description: tc.description,
          preconditions: tc.preconditions,
          steps,
          expectedResult: tc.expectedResult,
          priority: (['critical', 'high', 'medium', 'low'].includes(tc.priority) ? tc.priority : 'medium') as any,
          type: (['manual', 'automated'].includes(tc.type) ? tc.type : 'manual') as any,
          suiteId,
          projectId,
          tags: tc.tags.split(',').map(t => t.trim()).filter(Boolean),
        };
      });

      onImport(testCasesToImport);
      toast.success(`Successfully imported ${testCasesToImport.length} test cases`);
      setImportedData([]);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to import test cases');
    } finally {
      setImporting(false);
    }
  };

  const clearImport = () => {
    setImportedData([]);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Import / Export Test Cases</DialogTitle>
          <DialogDescription>
            Import test cases from CSV or JSON files, or export your existing test cases
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => exportTestCases('csv')}>
                <FileText className="h-8 w-8" />
                <span>Export as CSV</span>
                <span className="text-xs text-muted-foreground">{testCases.length} test cases</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => exportTestCases('json')}>
                <FileText className="h-8 w-8" />
                <span>Export as JSON</span>
                <span className="text-xs text-muted-foreground">{testCases.length} test cases</span>
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Download Template</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV Template
                </Button>
                <Button variant="secondary" size="sm" onClick={downloadJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  JSON Template
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use these templates as a reference for importing test cases
              </p>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="file-upload">Upload File</Label>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports CSV and JSON formats. Maximum 100 test cases per import.
              </p>
            </div>

            {importError && (
              <Alert variant="destructive">
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}

            {importedData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Preview ({importedData.length} test cases)</p>
                  <Button variant="ghost" size="sm" onClick={clearImport}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-48 border rounded-lg">
                  <div className="p-3 space-y-2">
                    {importedData.slice(0, 20).map((tc, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                        <span className="font-mono text-muted-foreground w-8">{idx + 1}</span>
                        <span className="flex-1 truncate">{tc.title}</span>
                        <Badge variant="outline">{tc.priority}</Badge>
                        <Badge variant="outline">{tc.type}</Badge>
                      </div>
                    ))}
                    {importedData.length > 20 && (
                      <p className="text-center text-sm text-muted-foreground py-2">
                        ... and {importedData.length - 20} more
                      </p>
                    )}
                  </div>
                </ScrollArea>
                <Button onClick={handleImport} disabled={importing} className="w-full">
                  {importing ? 'Importing...' : `Import ${importedData.length} Test Cases`}
                </Button>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">File Format Requirements</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• CSV/JSON must include a "Title" field (required)</li>
                <li>• Steps should be separated by "|" (pipe character)</li>
                <li>• Tags should be comma-separated</li>
                <li>• Priority: critical, high, medium, low</li>
                <li>• Type: manual, automated</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
