import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// API base URL - in production, this would come from env
const API_BASE = '/api'

// Types
export interface QueueStats {
  queue: string
  total: number
  active: number
  completed: number
  failed: number
  created: number
  retry: number
  cancelled: number
}

export interface Job {
  id: string
  name: string
  state: string
  priority: number
  retrycount: number
  retrylimit: number
  startafter: string
  startedon: string | null
  createdon: string
  completedon: string | null
  data: any
  output: any
}

export interface JobDetails extends Job {
  retrydelay: number
  retrybackoff: boolean
  singletonkey: string | null
  singletonon: string | null
  expirein: number
  keepuntil: number
}

export interface ChartData {
  time_bucket: string
  time_label: string
  total: number
  completed: number
  failed: number
  active: number
}

// API functions
const fetchQueues = async (): Promise<QueueStats[]> => {
  const response = await fetch(`${API_BASE}/queues`)
  if (!response.ok) throw new Error('Failed to fetch queues')
  return response.json()
}

const fetchQueueStats = async (queueName: string): Promise<ChartData[]> => {
  const interval = localStorage.getItem('pgboss-interval') || 'hour'
  const response = await fetch(`${API_BASE}/stats/${interval}?queue=${encodeURIComponent(queueName)}`)
  if (!response.ok) throw new Error('Failed to fetch queue stats')
  return response.json()
}

const fetchGlobalStats = async (): Promise<ChartData[]> => {
  const interval = localStorage.getItem('pgboss-interval') || 'hour'
  const response = await fetch(`${API_BASE}/stats/${interval}`)
  if (!response.ok) throw new Error('Failed to fetch global stats')
  return response.json()
}

const fetchJobs = async ({ 
  queueName, 
  state, 
  limit = 50, 
  offset = 0 
}: { 
  queueName: string
  state?: string
  limit?: number
  offset?: number
}): Promise<Job[]> => {
  let url = `${API_BASE}/jobs/${encodeURIComponent(queueName)}?limit=${limit}&offset=${offset}`
  if (state) url += `&state=${state}`
  
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch jobs')
  return response.json()
}

const fetchJobDetails = async (jobId: string): Promise<JobDetails> => {
  const response = await fetch(`${API_BASE}/job/${jobId}`)
  if (!response.ok) {
    if (response.status === 404) throw new Error('Job not found')
    throw new Error('Failed to fetch job details')
  }
  return response.json()
}

// Hooks
export const useQueues = () => {
  return useQuery({
    queryKey: ['queues'],
    queryFn: fetchQueues,
  })
}

export const useQueueStats = (queueName: string | null) => {
  return useQuery({
    queryKey: ['queueStats', queueName],
    queryFn: () => fetchQueueStats(queueName!),
    enabled: !!queueName,
  })
}

export const useGlobalStats = () => {
  return useQuery({
    queryKey: ['globalStats'],
    queryFn: fetchGlobalStats,
  })
}

export const useJobs = ({
  queueName,
  state,
  limit,
  offset,
}: {
  queueName: string
  state?: string
  limit?: number
  offset?: number
}) => {
  return useQuery({
    queryKey: ['jobs', queueName, state, limit, offset],
    queryFn: () => fetchJobs({ queueName, state, limit, offset }),
    enabled: !!queueName,
  })
}

export const useJobDetails = (jobId: string | null) => {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJobDetails(jobId!),
    enabled: !!jobId,
  })
}

// Mutations
export const useRetryJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`${API_BASE}/job/${jobId}/retry`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to retry job')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export const useCancelJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`${API_BASE}/job/${jobId}/cancel`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to cancel job')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}