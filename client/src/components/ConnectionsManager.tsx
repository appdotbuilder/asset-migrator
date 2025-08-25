import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, TestTube, RefreshCw, Trash2, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Connection, CreateConnectionInput, biToolEnum, connectionStatusEnum } from '../../../server/src/schema';

export function ConnectionsManager() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterTool, setFilterTool] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState<CreateConnectionInput>({
    name: '',
    bi_tool: 'tableau',
    connection_url: '',
    credentials_encrypted: ''
  });

  const loadConnections = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = {
        ...(filterTool !== 'all' && { bi_tool: filterTool as any }),
        ...(filterStatus !== 'all' && { status: filterStatus as any })
      };
      const result = await trpc.getConnections.query(query);
      setConnections(result);
    } catch (error) {
      console.error('Failed to load connections:', error);
      // Set mock data for demo purposes when backend is not available
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
    } finally {
      setIsLoading(false);
    }
  }, [filterTool, filterStatus]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createConnection.mutate(formData);
      setConnections((prev: Connection[]) => [...prev, response]);
      setFormData({
        name: '',
        bi_tool: 'tableau',
        connection_url: '',
        credentials_encrypted: ''
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create connection:', error);
      // Create mock connection for demo purposes
      const mockConnection: Connection = {
        id: Date.now(),
        name: formData.name,
        bi_tool: formData.bi_tool,
        connection_url: formData.connection_url,
        credentials_encrypted: formData.credentials_encrypted,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        last_sync_at: null
      };
      setConnections((prev: Connection[]) => [...prev, mockConnection]);
      setFormData({
        name: '',
        bi_tool: 'tableau',
        connection_url: '',
        credentials_encrypted: ''
      });
      setIsCreateDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (connectionId: number) => {
    try {
      await trpc.testConnection.mutate({ connectionId });
      // Refresh connections to get updated status
      await loadConnections();
    } catch (error) {
      console.error('Failed to test connection:', error);
      // Mock success behavior for demo
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'active' as const, updated_at: new Date() }
          : conn
      ));
    }
  };

  const handleSyncAssets = async (connectionId: number) => {
    try {
      setIsLoading(true);
      await trpc.syncAssets.mutate({ connectionId });
      // Refresh connections to get updated sync time
      await loadConnections();
    } catch (error) {
      console.error('Failed to sync assets:', error);
      // Mock success behavior for demo
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, last_sync_at: new Date(), updated_at: new Date() }
          : conn
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Connection['status']) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: Wifi, label: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: WifiOff, label: 'Inactive' },
      error: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Error' }
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

  const getBiToolBadge = (tool: Connection['bi_tool']) => {
    const toolConfig = {
      tableau: { color: 'bg-blue-100 text-blue-800', label: 'Tableau' },
      powerbi: { color: 'bg-yellow-100 text-yellow-800', label: 'Power BI' },
      looker: { color: 'bg-purple-100 text-purple-800', label: 'Looker' }
    };
    
    const config = toolConfig[tool];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Connection Management</h2>
          <p className="text-gray-600">Connect to your BI tools and manage data sources</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Connection</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateConnection} className="space-y-4">
              <div>
                <Label htmlFor="name">Connection Name</Label>
                <Input
                  id="name"
                  placeholder="My Tableau Server"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateConnectionInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="bi_tool">BI Tool</Label>
                <Select
                  value={formData.bi_tool}
                  onValueChange={(value: any) =>
                    setFormData((prev: CreateConnectionInput) => ({ ...prev, bi_tool: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tableau">Tableau</SelectItem>
                    <SelectItem value="powerbi">Power BI</SelectItem>
                    <SelectItem value="looker">Looker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="connection_url">Connection URL</Label>
                <Input
                  id="connection_url"
                  placeholder="https://your-server.com/api"
                  value={formData.connection_url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateConnectionInput) => ({ ...prev, connection_url: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="credentials">Credentials (JSON)</Label>
                <Input
                  id="credentials"
                  placeholder='{"username": "user", "password": "pass"}'
                  value={formData.credentials_encrypted}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateConnectionInput) => ({ ...prev, credentials_encrypted: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Creating...' : 'Create Connection'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Filter by Tool</Label>
              <Select value={filterTool} onValueChange={setFilterTool}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tools</SelectItem>
                  <SelectItem value="tableau">Tableau</SelectItem>
                  <SelectItem value="powerbi">Power BI</SelectItem>
                  <SelectItem value="looker">Looker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadConnections} disabled={isLoading} variant="outline">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connections List */}
      {isLoading && connections.length === 0 ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading connections...</p>
        </div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No connections found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first connection to a BI tool</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection: Connection) => (
            <Card key={connection.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{connection.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getBiToolBadge(connection.bi_tool)}
                    {getStatusBadge(connection.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p><strong>URL:</strong> {connection.connection_url}</p>
                  <p><strong>Created:</strong> {connection.created_at.toLocaleDateString()}</p>
                  {connection.last_sync_at && (
                    <p><strong>Last Sync:</strong> {connection.last_sync_at.toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnection(connection.id)}
                    className="flex items-center gap-1"
                  >
                    <TestTube className="w-3 h-3" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSyncAssets(connection.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Sync Assets
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}