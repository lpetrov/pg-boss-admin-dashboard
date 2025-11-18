import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { RefreshCw, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQueues } from '@/hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: queues = [], isLoading } = useQueues()
  const [search, setSearch] = useState('')
  const [interval, setInterval] = useState(localStorage.getItem('pgboss-interval') || 'hour')
  
  const filteredQueues = queues.filter(q => 
    q.queue.toLowerCase().includes(search.toLowerCase())
  )
  
  const handleRefresh = () => {
    queryClient.invalidateQueries()
  }
  
  const handleIntervalChange = (value: string) => {
    setInterval(value)
    localStorage.setItem('pgboss-interval', value)
    queryClient.invalidateQueries({ queryKey: ['globalStats'] })
    queryClient.invalidateQueries({ queryKey: ['queueStats'] })
  }
  
  const getQueueHealth = (queue: typeof queues[0]) => {
    if (queue.failed > 0) return 'text-destructive'
    if (queue.active > 0) return 'text-yellow-500'
    return 'text-green-500'
  }
  
  const currentQueue = location.pathname.match(/^\/queue\/([^/]+)/)?.[1]
  
  return (
    <aside className="w-[280px] border-r bg-card flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <Link to="/overview" className="block">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            PgBoss
          </h1>
        </Link>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Connected
        </div>
      </div>
      
      {/* Queues */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Queues</h3>
            <span className="text-xs bg-secondary px-2 py-1 rounded-full">
              {queues.length}
            </span>
          </div>
          
          <Input
            type="text"
            placeholder="Filter queues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        
        {/* Queue List */}
        <div className="flex-1 overflow-y-auto px-2">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
            </div>
          ) : filteredQueues.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No queues found
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              {filteredQueues.map((queue) => (
                <button
                  key={queue.queue}
                  onClick={() => navigate(`/queue/${encodeURIComponent(queue.queue)}`)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    currentQueue === queue.queue && "bg-primary text-primary-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{queue.queue}</span>
                    <span className={cn("h-2 w-2 rounded-full", getQueueHealth(queue))} />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs opacity-70">
                    <span className="flex items-center gap-1">
                      <span className="text-blue-400">●</span>
                      {queue.active.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-red-400">●</span>
                      {queue.failed.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">●</span>
                      {queue.total.toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleRefresh}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        
        <Select value={interval} onValueChange={handleIntervalChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minute">1 Minute</SelectItem>
            <SelectItem value="hour">1 Hour</SelectItem>
            <SelectItem value="day">1 Day</SelectItem>
            <SelectItem value="week">1 Week</SelectItem>
            <SelectItem value="month">1 Month</SelectItem>
            <SelectItem value="year">1 Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </aside>
  )
}