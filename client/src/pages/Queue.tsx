import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Activity, CheckCircle2, XCircle, AlertCircle, BarChart3, List } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQueues, useQueueStats } from '@/hooks/useApi'
import QueueChart from '@/components/QueueChart'

export default function Queue() {
  const { queueName } = useParams<{ queueName: string }>()
  const navigate = useNavigate()
  const { data: queues = [] } = useQueues()
  const { data: chartData = [] } = useQueueStats(queueName!)
  
  const queue = queues.find(q => q.queue === queueName)
  
  if (!queue) {
    return <div className="p-6 text-center text-muted-foreground">Queue not found</div>
  }
  
  return (
    <div className="p-6">
      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Stats
          </TabsTrigger>
          <TabsTrigger 
            value="jobs" 
            onClick={() => navigate(`/queue/${encodeURIComponent(queueName!)}/jobs`)}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            Jobs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="stats" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queue.active.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Currently processing</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queue.completed.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Successfully finished</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queue.failed.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(queue.created + queue.retry).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Waiting to process</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Job Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <QueueChart data={chartData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}