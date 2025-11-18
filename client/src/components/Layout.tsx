import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Zap } from 'lucide-react'
import Sidebar from './Sidebar'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const paths = location.pathname.split('/').filter(Boolean)
  
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b bg-card">
          <div className="flex h-16 items-center px-6">
            <nav className="flex items-center space-x-2 text-sm">
              <Link 
                to="/overview"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              
              {paths.map((path, index) => {
                const href = '/' + paths.slice(0, index + 1).join('/')
                const isLast = index === paths.length - 1
                
                return (
                  <React.Fragment key={href}>
                    <span className="text-muted-foreground">/</span>
                    {isLast ? (
                      <span className="text-foreground">
                        {decodeURIComponent(path)}
                      </span>
                    ) : (
                      <Link
                        to={href}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {decodeURIComponent(path)}
                      </Link>
                    )}
                  </React.Fragment>
                )
              })}
            </nav>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}