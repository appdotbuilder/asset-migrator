import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConnectionsManager } from '@/components/ConnectionsManager';
import { AssetsExplorer } from '@/components/AssetsExplorer';
import { MigrationDashboard } from '@/components/MigrationDashboard';
import { Database, ArrowRightLeft, BarChart3, Settings, Info } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('connections');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Database className="text-blue-600" />
            BI Asset Migration Platform
          </h1>
          <p className="text-lg text-gray-600">
            Migrate your Tableau, PowerBI, and Looker assets to Databricks AI/BI 🚀
          </p>
        </header>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Demo Mode:</strong> This application is running with mock data for demonstration purposes. 
            All connections, assets, and migration jobs shown are sample data. In a production environment, 
            this would connect to your actual BI tools and Databricks workspace.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white shadow-sm">
            <TabsTrigger 
              value="connections" 
              className="flex items-center gap-2 text-base py-3"
            >
              <Settings className="w-4 h-4" />
              Connections
            </TabsTrigger>
            <TabsTrigger 
              value="assets" 
              className="flex items-center gap-2 text-base py-3"
            >
              <BarChart3 className="w-4 h-4" />
              Assets
            </TabsTrigger>
            <TabsTrigger 
              value="migrations" 
              className="flex items-center gap-2 text-base py-3"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Migrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-6">
            <ConnectionsManager />
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            <AssetsExplorer />
          </TabsContent>

          <TabsContent value="migrations" className="space-y-6">
            <MigrationDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;