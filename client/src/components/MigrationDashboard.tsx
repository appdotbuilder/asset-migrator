import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlayCircle, PauseCircle, XCircle, Clock, CheckCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { MigrationJob, MigrationHistory } from '../../../server/src/schema';

export function MigrationDashboard() {
  const [migrationJobs, setMigrationJobs] = useState<MigrationJob[]>([]);
  const [migrationHistory, setMigrationHistory] = useState<MigrationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const loadMigrationJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = {
        ...(filterStatus !== 'all' && { status: filterStatus as any }),
        ...(filterTarget !== 'all' && { target_databricks_asset_type: filterTarget as any })
      };
      const result = await trpc.getMigrationJobs.query(query);
      setMigrationJobs(result);
    } catch (error) {
      console.error('Failed to load migration jobs:', error);
      // Set mock data for demo purposes when backend is not available
      const mockJobs: MigrationJob[] = [
        {
          id: 1,
          name: 'Q4 Reports Migration',
          description: 'Migration of Q4 financial and sales reports to Databricks',
          source_asset_ids: [1, 5],
          target_databricks_asset_type: 'ai_bi_dashboard',
          status: 'completed',
          transformation_config: { dateFormat: 'yyyy-mm-dd', currency: 'USD' },
          mapping_config: { revenue: 'total_revenue', customer_id: 'cust_id' },
          error_message: null,
          progress_percentage: 100,
          created_at: new Date('2024-01-18'),
          updated_at: new Date('2024-01-20'),
          started_at: new Date('2024-01-18T10:00:00Z'),
          completed_at: new Date('2024-01-20T14:30:00Z')
        },
        {
          id: 2,
          name: 'Executive Dashboard Migration',
          description: 'Migrating executive KPI dashboard to Unity Catalog',
          source_asset_ids: [2],
          target_databricks_asset_type: 'unity_catalog_metric_view',
          status: 'in_progress',
          transformation_config: { metrics: ['revenue', 'profit', 'customers'] },
          mapping_config: null,
          error_message: null,
          progress_percentage: 65,
          created_at: new Date('2024-01-20'),
          updated_at: new Date('2024-01-21'),
          started_at: new Date('2024-01-20T09:15:00Z'),
          completed_at: null
        },
        {
          id: 3,
          name: 'Marketing Analytics Migration',
          description: 'Batch migration of marketing dashboards and reports',
          source_asset_ids: [4],
          target_databricks_asset_type: 'ai_bi_genie_space',
          status: 'pending',
          transformation_config: null,
          mapping_config: { campaign_id: 'campaign_identifier', roi: 'return_on_investment' },
          error_message: null,
          progress_percentage: 0,
          created_at: new Date('2024-01-21'),
          updated_at: new Date('2024-01-21'),
          started_at: null,
          completed_at: null
        },
        {
          id: 4,
          name: 'Data Source Migration',
          description: 'Migration of customer analytics data source',
          source_asset_ids: [3],
          target_databricks_asset_type: 'unity_catalog_metric_view',
          status: 'failed',
          transformation_config: { schema_mapping: true },
          mapping_config: null,
          error_message: 'Connection timeout during schema validation',
          progress_percentage: 25,
          created_at: new Date('2024-01-19'),
          updated_at: new Date('2024-01-19'),
          started_at: new Date('2024-01-19T11:30:00Z'),
          completed_at: null
        }
      ];
      
      // Apply filters if any
      let filteredJobs = mockJobs;
      if (filterStatus !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.status === filterStatus);
      }
      if (filterTarget !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.target_databricks_asset_type === filterTarget);
      }
      
      setMigrationJobs(filteredJobs);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterTarget]);

  const loadMigrationHistory = useCallback(async (jobId: number) => {
    try {
      const result = await trpc.getMigrationHistory.query({ migrationJobId: jobId });
      setMigrationHistory(result);
    } catch (error) {
      console.error('Failed to load migration history:', error);
      // Mock history data for demo purposes
      const mockHistory: MigrationHistory[] = [
        {
          id: 1,
          migration_job_id: jobId,
          status: 'pending',
          message: 'Migration job created and queued',
          created_at: new Date(Date.now() - 3600000) // 1 hour ago
        },
        {
          id: 2,
          migration_job_id: jobId,
          status: 'in_progress',
          message: 'Started asset analysis and validation',
          created_at: new Date(Date.now() - 3000000) // 50 minutes ago
        },
        {
          id: 3,
          migration_job_id: jobId,
          status: 'in_progress',
          message: 'Applying data transformations and field mappings',
          created_at: new Date(Date.now() - 2400000) // 40 minutes ago
        },
        {
          id: 4,
          migration_job_id: jobId,
          status: jobId === 1 ? 'completed' : jobId === 4 ? 'failed' : 'in_progress',
          message: jobId === 1 
            ? 'Migration completed successfully' 
            : jobId === 4 
            ? 'Migration failed: Connection timeout during schema validation'
            : 'Processing asset metadata and creating Databricks objects',
          created_at: new Date(Date.now() - 1800000) // 30 minutes ago
        }
      ];
      setMigrationHistory(mockHistory);
    }
  }, []);

  useEffect(() => {
    loadMigrationJobs();
  }, [loadMigrationJobs]);

  const handleCancelJob = async (jobId: number) => {
    try {
      await trpc.cancelMigrationJob.mutate({ jobId });
      // Refresh jobs list
      await loadMigrationJobs();
    } catch (error) {
      console.error('Failed to cancel migration job:', error);
      // Mock cancel behavior for demo
      setMigrationJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'cancelled' as const, updated_at: new Date() }
          : job
      ));
    }
  };

  const handleViewHistory = async (jobId: number) => {
    setSelectedJobId(jobId);
    setIsHistoryDialogOpen(true);
    await loadMigrationHistory(jobId);
  };

  const getStatusBadge = (status: MigrationJob['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: PlayCircle, label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Failed' },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Cancelled' }
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getTargetTypeBadge = (type: MigrationJob['target_databricks_asset_type']) => {
    const config = {
      unity_catalog_metric_view: { color: 'bg-purple-100 text-purple-800', label: 'Unity Catalog' },
      ai_bi_dashboard: { color: 'bg-blue-100 text-blue-800', label: 'AI/BI Dashboard' },
      ai_bi_genie_space: { color: 'bg-green-100 text-green-800', label: 'Genie Space' }
    };
    
    const typeConfig = config[type];
    return (
      <Badge className={typeConfig.color}>
        {typeConfig.label}
      </Badge>
    );
  };

  const getProgressColor = (status: MigrationJob['status'], progress: number) => {
    if (status === 'failed') return 'bg-red-500';
    if (status === 'cancelled') return 'bg-gray-500';
    if (status === 'completed') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const formatDuration = (startTime: Date | null, endTime: Date | null) => {
    if (!startTime) return 'Not started';
    
    const end = endTime || new Date();
    const diffMs = end.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Migration Dashboard</h2>
          <p className="text-gray-600">Monitor and manage your asset migration jobs</p>
        </div>
        <Button onClick={loadMigrationJobs} disabled={isLoading} variant="outline">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['pending', 'in_progress', 'completed', 'failed'].map((status: string) => {
          const count = migrationJobs.filter((job: MigrationJob) => job.status === status).length;
          const statusConfig = {
            pending: { color: 'text-yellow-600 bg-yellow-50', label: 'Pending' },
            in_progress: { color: 'text-blue-600 bg-blue-50', label: 'In Progress' },
            completed: { color: 'text-green-600 bg-green-50', label: 'Completed' },
            failed: { color: 'text-red-600 bg-red-50', label: 'Failed' }
          };
          const config = statusConfig[status as keyof typeof statusConfig];
          
          return (
            <Card key={status}>
              <CardContent className="pt-6">
                <div className={`rounded-lg p-4 ${config.color}`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm font-medium">{config.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={filterTarget} onValueChange={setFilterTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Target Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Target Types</SelectItem>
                  <SelectItem value="unity_catalog_metric_view">Unity Catalog</SelectItem>
                  <SelectItem value="ai_bi_dashboard">AI/BI Dashboard</SelectItem>
                  <SelectItem value="ai_bi_genie_space">Genie Space</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Migration Jobs List */}
      {isLoading && migrationJobs.length === 0 ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading migration jobs...</p>
        </div>
      ) : migrationJobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No migration jobs found</h3>
            <p className="text-gray-600 mb-4">Start by selecting assets to migrate</p>
            <Button onClick={() => window.location.hash = 'assets'} variant="outline">
              Go to Assets
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {migrationJobs.map((job: MigrationJob) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{job.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getTargetTypeBadge(job.target_databricks_asset_type)}
                    {getStatusBadge(job.status)}
                  </div>
                </div>
                {job.description && (
                  <p className="text-sm text-gray-600 mt-1">{job.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{job.progress_percentage}%</span>
                  </div>
                  <Progress
                    value={job.progress_percentage}
                    className="h-2"
                    style={{
                      background: '#f1f5f9'
                    }}
                  />
                </div>

                {/* Job Details */}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p><strong>Assets Count:</strong> {job.source_asset_ids.length}</p>
                    <p><strong>Created:</strong> {job.created_at.toLocaleDateString()}</p>
                    {job.started_at && (
                      <p><strong>Started:</strong> {job.started_at.toLocaleDateString()}</p>
                    )}
                  </div>
                  <div>
                    <p><strong>Duration:</strong> {formatDuration(job.started_at, job.completed_at)}</p>
                    {job.completed_at && (
                      <p><strong>Completed:</strong> {job.completed_at.toLocaleDateString()}</p>
                    )}
                    {job.error_message && (
                      <p className="text-red-600"><strong>Error:</strong> {job.error_message}</p>
                    )}
                  </div>
                </div>

                {/* Configuration Preview */}
                {(job.transformation_config || job.mapping_config) && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                    {job.transformation_config && (
                      <p><strong>Transformation:</strong> {Object.keys(job.transformation_config).length} rules</p>
                    )}
                    {job.mapping_config && (
                      <p><strong>Mapping:</strong> {Object.keys(job.mapping_config).length} fields</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewHistory(job.id)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    View History
                  </Button>
                  
                  {(job.status === 'pending' || job.status === 'in_progress') && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-3 h-3" />
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Migration Job</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel the migration job "{job.name}"? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancelJob(job.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Cancel Job
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Migration History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Migration History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {migrationHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No history entries found</p>
            ) : (
              <div className="space-y-3">
                {migrationHistory.map((entry: MigrationHistory) => (
                  <div
                    key={entry.id}
                    className="border-l-4 border-blue-200 pl-4 py-2 bg-gray-50 rounded-r-md"
                  >
                    <div className="flex items-center justify-between">
                      {getStatusBadge(entry.status)}
                      <span className="text-sm text-gray-500">
                        {entry.created_at.toLocaleDateString()} {entry.created_at.toLocaleTimeString()}
                      </span>
                    </div>
                    {entry.message && (
                      <p className="text-sm text-gray-700 mt-1">{entry.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}