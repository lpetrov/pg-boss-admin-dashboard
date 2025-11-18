import React from 'react'
import { Activity, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQueues, useGlobalStats } from '@/hooks/useApi'
import QueueChart from '@/components/QueueChart'

export default function Overview() {
  const { data: queues = [] } = useQueues()
  const { data: chartData = [] } = useGlobalStats()
  
  const totals = queues.reduce((acc, queue) => ({
    active: acc.active + queue.active,
    completed: acc.completed + queue.completed,
    failed: acc.failed + queue.failed,
    pending: acc.pending + queue.created + queue.retry
  }), { active: 0, completed: 0, failed: 0, pending: 0 })
  
  return (
    <div className="space-y-6 p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.active.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Currently processing</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.completed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.failed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.pending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Waiting to process</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>All Queues Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <QueueChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  )
}