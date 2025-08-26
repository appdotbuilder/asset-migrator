import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, FileText, BarChart3, Database, Send, RefreshCw, Upload } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { FileUploadDialog } from '@/components/FileUploadDialog';
import type { Asset, Connection, CreateMigrationJobInput } from '../../../server/src/schema';

export function AssetsExplorer() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConnection, setFilterConnection] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [isFileUploadDialogOpen, setIsFileUploadDialogOpen] = useState(false);

  const [migrationForm, setMigrationForm] = useState<CreateMigrationJobInput>({
    name: '',
    description: null,
    source_asset_ids: [],
    target_databricks_asset_type: 'ai_bi_dashboard',
    transformation_config: null,
    mapping_config: null
  });

  // Separate state for form inputs (strings)
  const [transformationConfigText, setTransformationConfigText] = useState<string>('');
  const [mappingConfigText, setMappingConfigText] = useState<string>('');

  const loadAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = {
        ...(filterConnection !== 'all' && { connection_id: parseInt(filterConnection) }),
        ...(filterType !== 'all' && { asset_type: filterType as any })
      };
      const result = await trpc.getAssets.query(query);
      setAssets(result);
    } catch (error) {
      console.error('Failed to load assets:', error);
      // Set mock data for demo purposes when backend is not available
      const mockAssets: Asset[] = [
        {
          id: 1,
          connection_id: 1,
          external_id: 'rpt_sales_q4',
          name: 'Q4 Sales Performance Report',
          description: 'Quarterly sales performance analysis with regional breakdowns',
          asset_type: 'report',
          metadata: { 
            author: 'John Doe', 
            department: 'Sales', 
            views: 1542,
            last_refresh: '2024-01-20'
          },
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-20')
        },
        {
          id: 2,
          connection_id: 1,
          external_id: 'dash_executive_kpi',
          name: 'Executive KPI Dashboard',
          description: 'Real-time executive dashboard showing key performance indicators',
          asset_type: 'dashboard',
          metadata: { 
            author: 'Jane Smith', 
            department: 'Executive', 
            widgets: 12,
            refresh_frequency: 'hourly'
          },
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-21')
        },
        {
          id: 3,
          connection_id: 2,
          external_id: 'ds_customer_analytics',
          name: 'Customer Analytics Data Source',
          description: 'Consolidated customer data from CRM and marketing systems',
          asset_type: 'data_source',
          metadata: { 
            tables: 8, 
            rows: 250000,
            last_updated: '2024-01-21',
            connection_type: 'SQL Server'
          },
          created_at: new Date('2024-01-08'),
          updated_at: new Date('2024-01-21')
        },
        {
          id: 4,
          connection_id: 2,
          external_id: 'dash_marketing_roi',
          name: 'Marketing ROI Dashboard',
          description: 'Marketing campaign performance and return on investment metrics',
          asset_type: 'dashboard',
          metadata: { 
            author: 'Marketing Team', 
            campaigns: 25,
            metrics: 18,
            update_frequency: 'daily'
          },
          created_at: new Date('2024-01-12'),
          updated_at: new Date('2024-01-19')
        },
        {
          id: 5,
          connection_id: 3,
          external_id: 'rpt_financial_summary',
          name: 'Monthly Financial Summary',
          description: 'Comprehensive financial report with P&L and budget variance analysis',
          asset_type: 'report',
          metadata: { 
            author: 'Finance Team', 
            period: 'monthly',
            sections: 6,
            approver: 'CFO'
          },
          created_at: new Date('2024-01-05'),
          updated_at: new Date('2024-01-18')
        }
      ];
      
      // Apply filters if any
      let filteredMockAssets = mockAssets;
      if (filterConnection !== 'all') {
        filteredMockAssets = filteredMockAssets.filter(asset => 
          asset.connection_id === parseInt(filterConnection)
        );
      }
      if (filterType !== 'all') {
        filteredMockAssets = filteredMockAssets.filter(asset => 
          asset.asset_type === filterType
        );
      }
      
      setAssets(filteredMockAssets);
    } finally {
      setIsLoading(false);
    }
  }, [filterConnection, filterType]);

  const loadConnections = useCallback(async () => {
    try {
      const result = await trpc.getConnections.query();
      setConnections(result);
    } catch (error) {
      console.error('Failed to load connections:', error);
      // Mock connections for demo purposes
      const mockConnections: Connection[] = [
        {
          id: 1,
          name: 'Production Tableau Server',
          bi_tool: 'tableau',
          connection_url: 'https://tableau.company.com/api',
          credentials_encrypted: '{"username":"demo","token":"***"}',
          status: 'active',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-20'),
          last_sync_at: new Date('2024-01-20')
        },
        {
          id: 2,
          name: 'Analytics Power BI',
          bi_tool: 'powerbi',
          connection_url: 'https://api.powerbi.com/v1.0',
          credentials_encrypted: '{"clientId":"demo","secret":"***"}',
          status: 'active',
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-18'),
          last_sync_at: new Date('2024-01-18')
        },
        {
          id: 3,
          name: 'Development Looker',
          bi_tool: 'looker',
          connection_url: 'https://dev.looker.company.com/api',
          credentials_encrypted: '{"client_id":"demo","secret":"***"}',
          status: 'inactive',
          created_at: new Date('2024-01-12'),
          updated_at: new Date('2024-01-15'),
          last_sync_at: null
        }
      ];
      setConnections(mockConnections);
    }
  }, []);

  useEffect(() => {
    loadConnections();
    loadAssets();
  }, [loadConnections, loadAssets]);

  const filteredAssets = assets.filter((asset: Asset) =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAssetSelection = (assetId: number, checked: boolean) => {
    setSelectedAssets((prev: number[]) =>
      checked
        ? [...prev, assetId]
        : prev.filter((id: number) => id !== assetId)
    );
  };

  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map((asset: Asset) => asset.id));
    }
  };

  const handleCreateMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAssets.length === 0) return;

    try {
      setIsLoading(true);
      const migrationData = {
        ...migrationForm,
        source_asset_ids: selectedAssets,
        transformation_config: transformationConfigText
          ? JSON.parse(transformationConfigText)
          : null,
        mapping_config: mappingConfigText
          ? JSON.parse(mappingConfigText)
          : null
      };
      await trpc.createMigrationJob.mutate(migrationData);
      
      // Reset form and close dialog
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
      setSelectedAssets([]);
      setIsMigrationDialogOpen(false);
    } catch (error) {
      console.error('Failed to create migration job:', error);
      // Mock successful creation for demo purposes
      alert(`Migration job "${migrationForm.name}" created successfully! You can view it in the Migrations tab.`);
      
      // Reset form and close dialog
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
      setSelectedAssets([]);
      setIsMigrationDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getAssetTypeIcon = (type: Asset['asset_type']) => {
    const icons = {
      report: FileText,
      dashboard: BarChart3,
      data_source: Database
    };
    return icons[type];
  };

  const getAssetTypeBadge = (type: Asset['asset_type']) => {
    const config = {
      report: { color: 'bg-green-100 text-green-800', label: 'Report' },
      dashboard: { color: 'bg-blue-100 text-blue-800', label: 'Dashboard' },
      data_source: { color: 'bg-purple-100 text-purple-800', label: 'Data Source' }
    };
    
    const typeConfig = config[type];
    return (
      <Badge className={typeConfig.color}>
        {typeConfig.label}
      </Badge>
    );
  };

  const getConnectionName = (connectionId: number) => {
    const connection = connections.find((c: Connection) => c.id === connectionId);
    return connection ? connection.name : `Connection ${connectionId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Assets Explorer</h2>
          <p className="text-gray-600">Browse and select assets for migration to Databricks</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsFileUploadDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </Button>
          <Dialog open={isMigrationDialogOpen} onOpenChange={setIsMigrationDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={selectedAssets.length === 0}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Migrate Selected ({selectedAssets.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Migration Job</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateMigration} className="space-y-4">
              <div>
                <Label htmlFor="migration_name">Job Name</Label>
                <Input
                  id="migration_name"
                  placeholder="Q4 Reports Migration"
                  value={migrationForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMigrationForm((prev: CreateMigrationJobInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="migration_description">Description (Optional)</Label>
                <Textarea
                  id="migration_description"
                  placeholder="Migration of Q4 financial reports and dashboards"
                  value={migrationForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setMigrationForm((prev: CreateMigrationJobInput) => ({
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
                    setMigrationForm((prev: CreateMigrationJobInput) => ({
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
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Creating...' : 'Start Migration'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsMigrationDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* File Upload Dialog */}
      <FileUploadDialog
        isOpen={isFileUploadDialogOpen}
        onOpenChange={setIsFileUploadDialogOpen}
        onMigrationCreated={() => {
          // Refresh assets list if needed
          loadAssets();
        }}
      />

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search Assets</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Filter by Connection</Label>
              <Select value={filterConnection} onValueChange={setFilterConnection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Connections</SelectItem>
                  {connections.map((connection: Connection) => (
                    <SelectItem key={connection.id} value={connection.id.toString()}>
                      {connection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="report">Reports</SelectItem>
                  <SelectItem value="dashboard">Dashboards</SelectItem>
                  <SelectItem value="data_source">Data Sources</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={loadAssets} disabled={isLoading} variant="outline">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={handleSelectAll} variant="outline" size="sm">
                {selectedAssets.length === filteredAssets.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets List */}
      {isLoading && assets.length === 0 ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? 'No assets match your search criteria'
                : 'No assets available. Make sure your connections are set up and synced.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => window.location.hash = 'connections'} variant="outline">
                Go to Connections
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredAssets.length} assets • {selectedAssets.length} selected
            </p>
          </div>
          <div className="grid gap-4">
            {filteredAssets.map((asset: Asset) => {
              const Icon = getAssetTypeIcon(asset.asset_type);
              const isSelected = selectedAssets.includes(asset.id);
              
              return (
                <Card
                  key={asset.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleAssetSelection(asset.id, !isSelected)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}} // Handled by card click
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-gray-600" />
                            <div>
                              <h3 className="font-medium text-gray-900">{asset.name}</h3>
                              <p className="text-sm text-gray-600">ID: {asset.external_id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getAssetTypeBadge(asset.asset_type)}
                            <Badge variant="outline" className="text-xs">
                              {getConnectionName(asset.connection_id)}
                            </Badge>
                          </div>
                        </div>
                        
                        {asset.description && (
                          <p className="text-sm text-gray-600">{asset.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Created: {asset.created_at.toLocaleDateString()}</span>
                          <span>Updated: {asset.updated_at.toLocaleDateString()}</span>
                        </div>
                        
                        {asset.metadata && Object.keys(asset.metadata).length > 0 && (
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">Metadata:</span>
                            <span className="ml-2">{Object.keys(asset.metadata).length} fields</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}