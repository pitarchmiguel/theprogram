'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function TestConnection() {
  const [status, setStatus] = useState<string>('Testing...')
  const [session, setSession] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const testConnection = async () => {
      try {
        setStatus('Testing Supabase connection...')
        
        // Test 1: Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setStatus(`Session error: ${sessionError.message}`)
          return
        }
        
        setSession(session)
        
        if (session) {
          setStatus(`✅ Connected! User: ${session.user.email}, Role: ${session.user.user_metadata?.role || 'none'}`)
        } else {
          setStatus('✅ Connected! No active session')
        }
        
      } catch (error) {
        setStatus(`❌ Connection error: ${error}`)
      }
    }

    testConnection()
  }, [supabase])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-center">Test Connection</h1>
        <div className="p-4 border rounded-lg">
          <p className="text-sm font-mono">{status}</p>
        </div>
        {session && (
          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">Session Info:</h2>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
} 