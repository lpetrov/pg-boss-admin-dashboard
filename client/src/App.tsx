import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import Overview from '@/pages/Overview'
import Queue from '@/pages/Queue'
import QueueJobs from '@/pages/QueueJobs'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000, // Refetch every 5 seconds
      staleTime: 1000,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/queue/:queueName" element={<Queue />} />
            <Route path="/queue/:queueName/jobs" element={<QueueJobs />} />
          </Routes>
        </Layout>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App