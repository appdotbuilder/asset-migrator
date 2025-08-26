import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileCheck, AlertCircle, X } from 'lucide-react';
import type { CreateMigrationJobInput } from '../../../server/src/schema';

interface FileUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMigrationCreated: () => void;
}

interface UploadedFileInfo {
  name: string;
  type: 'twbx' | 'pbi';
  size: number;
  metadata: Record<string, any>;
}

export function FileUploadDialog({ isOpen, onOpenChange, onMigrationCreated }: FileUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showMigrationForm, setShowMigrationForm] = useState(false);

  const [migrationForm, setMigrationForm] = useState<CreateMigrationJobInput>({
    name: '',
    description: null,
    source_asset_ids: [], // Will be filled with temporary asset ID
    target_databricks_asset_type: 'ai_bi_dashboard',
    transformation_config: null,
    mapping_config: null
  });

  const [transformationConfigText, setTransformationConfigText] = useState<string>('');
  const [mappingConfigText, setMappingConfigText] = useState<string>('');

  const resetDialog = useCallback(() => {
    setSelectedFile(null);
    setUploadedFile(null);
    setIsProcessing(false);
    setProcessingProgress(0);
    setError(null);
    setShowMigrationForm(false);
    setMigrationForm({
      name: '',
      description: null,
      source_asset_ids: [],
      target_databricks_asset_type: 'ai_bi_dashboard',
      transformation_config: null,
      mapping_config: null
    });
    setTransformationConfigText('');
    setMappingConfigText('');
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    
    // Validate file type
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (fileExtension !== 'twbx' && fileExtension !== 'pbi') {
      setError('Please select a valid .twbx (Tableau) or .pbi (Power BI) file.');
      return;
    }

    // Validate file size (limit to 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError('File size must be less than 100MB.');
      return;
    }

    setSelectedFile(file);
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      // Simulate file processing with progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Simulate API call to process the file
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fileExtension = selectedFile.name.toLowerCase().split('.').pop() as 'twbx' | 'pbi';
      
      // Mock extracted metadata based on file type
      const extractedMetadata = fileExtension === 'twbx' 
        ? {
            workbook_name: selectedFile.name.replace('.twbx', ''),
            tableau_version: '2023.3',
            data_sources: 3,
            worksheets: 8,
            dashboards: 2,
            extract_refreshed: '2024-01-15',
            author: 'Demo User',
            project: 'Finance'
          }
        : {
            report_name: selectedFile.name.replace('.pbi', ''),
            powerbi_version: '2.124',
            pages: 5,
            visuals: 24,
            data_sources: 2,
            last_refresh: '2024-01-18',
            author: 'Demo User',
            workspace: 'Analytics'
          };

      setProcessingProgress(100);
      clearInterval(progressInterval);

      const fileInfo: UploadedFileInfo = {
        name: selectedFile.name.replace(`.${fileExtension}`, ''),
        type: fileExtension,
        size: selectedFile.size,
        metadata: extractedMetadata
      };

      setUploadedFile(fileInfo);
      
      // Pre-populate migration form
      setMigrationForm(prev => ({
        ...prev,
        name: `Migration - ${fileInfo.name}`,
        description: `Migration job for uploaded ${fileExtension.toUpperCase()} file: ${fileInfo.name}`,
        target_databricks_asset_type: fileExtension === 'twbx' ? 'ai_bi_dashboard' : 'ai_bi_dashboard'
      }));

      setShowMigrationForm(true);
      
    } catch (error) {
      console.error('File processing failed:', error);
      setError('Failed to process the file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMigrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) return;

    try {
      setIsProcessing(true);
      
      // In a real implementation, this would:
      // 1. Create a temporary asset from the uploaded file
      // 2. Create a migration job with the temporary asset ID
      
      const migrationData = {
        ...migrationForm,
        source_asset_ids: [999], // Mock temporary asset ID
        transformation_config: transformationConfigText
          ? JSON.parse(transformationConfigText)
          : null,
        mapping_config: mappingConfigText
          ? JSON.parse(mappingConfigText)
          : null
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success
      alert(`Migration job "${migrationForm.name}" created successfully for uploaded file "${uploadedFile.name}"!`);
      
      onMigrationCreated();
      onOpenChange(false);
      resetDialog();
      
    } catch (error) {
      console.error('Failed to create migration job:', error);
      setError('Failed to create migration job. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload BI Asset File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!showMigrationForm ? (
            <div className="space-y-6">
              {/* File Selection */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Select File</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Choose a .twbx (Tableau workbook) or .pbi (Power BI) file to upload
                  </p>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".twbx,.pbi"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>

                {selectedFile && !isProcessing && !uploadedFile && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-gray-600">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setSelectedFile(null)}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Processing Progress */}
                {isProcessing && !showMigrationForm && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Processing file...</span>
                      <span className="text-sm text-gray-600">{processingProgress}%</span>
                    </div>
                    <Progress value={processingProgress} />
                    <p className="text-sm text-gray-600">
                      Extracting metadata and creating temporary asset...
                    </p>
                  </div>
                )}

                {/* File Processing Results */}
                {uploadedFile && !isProcessing && (
                  <div className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-start gap-3">
                      <FileCheck className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900">File processed successfully!</h4>
                        <div className="mt-2 space-y-1 text-sm text-green-800">
                          <p><strong>Name:</strong> {uploadedFile.name}</p>
                          <p><strong>Type:</strong> {uploadedFile.type.toUpperCase()}</p>
                          <p><strong>Size:</strong> {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <p><strong>Extracted fields:</strong> {Object.keys(uploadedFile.metadata).length}</p>
                        </div>
                        <div className="mt-3">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-green-800 hover:text-green-900">
                              View extracted metadata
                            </summary>
                            <div className="mt-2 p-2 bg-green-100 rounded text-xs font-mono">
                              {JSON.stringify(uploadedFile.metadata, null, 2)}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {selectedFile && !uploadedFile && !isProcessing && (
                    <Button onClick={processFile} className="flex-1">
                      Process File
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Migration Job Form */}
              <form onSubmit={handleMigrationSubmit} className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-medium text-gray-900">Create Migration Job</h3>
                  <p className="text-sm text-gray-600">
                    Configure the migration settings for your uploaded file
                  </p>
                </div>

                <div>
                  <Label htmlFor="migration_name">Job Name</Label>
                  <Input
                    id="migration_name"
                    value={migrationForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMigrationForm(prev => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="migration_description">Description</Label>
                  <Textarea
                    id="migration_description"
                    value={migrationForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setMigrationForm(prev => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="target_type">Target Databricks Asset Type</Label>
                  <Select
                    value={migrationForm.target_databricks_asset_type}
                    onValueChange={(value: any) =>
                      setMigrationForm(prev => ({
                        ...prev,
                        target_databricks_asset_type: value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unity_catalog_metric_view">Unity Catalog Metric View</SelectItem>
                      <SelectItem value="ai_bi_dashboard">AI/BI Dashboard</SelectItem>
                      <SelectItem value="ai_bi_genie_space">AI/BI Genie Space</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="transformation_config">Transformation Config (JSON, Optional)</Label>
                  <Textarea
                    id="transformation_config"
                    placeholder='{"dateFormat": "yyyy-mm-dd", "currency": "USD"}'
                    value={transformationConfigText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setTransformationConfigText(e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="mapping_config">Field Mapping Config (JSON, Optional)</Label>
                  <Textarea
                    id="mapping_config"
                    placeholder='{"revenue": "total_revenue", "customer_id": "cust_id"}'
                    value={mappingConfigText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setMappingConfigText(e.target.value)
                    }
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isProcessing} 
                    className="flex-1"
                  >
                    {isProcessing ? 'Creating Migration...' : 'Start Migration'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowMigrationForm(false);
                      setUploadedFile(null);
                    }}
                    disabled={isProcessing}
                  >
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}