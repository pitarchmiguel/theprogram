/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

export default function TestConnectionPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    const testResults: any = {}

    // Test 1: Conexión básica a Supabase
    try {
      const { data: user } = await supabase.auth.getUser()
      testResults.authConnection = {
        success: true,
        user: user.user ? `Usuario: ${user.user.email}` : 'No hay usuario logueado'
      }
    } catch (error) {
      testResults.authConnection = {
        success: false,
        error: error
      }
    }

    // Test 2: Verificar si existe la tabla profiles
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        testResults.profilesTable = {
          success: false,
          error: `Error: ${error.message} (Code: ${error.code})`,
          recommendation: error.code === '42P01' ? 
            'La tabla "profiles" no existe. Necesitas ejecutar el SQL de setup.' :
            error.code === 'PGRST116' ?
            'No tienes permisos para acceder a la tabla profiles. Revisa las políticas RLS.' :
            'Hay un problema con la tabla profiles.',
          details: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          }
        }
      } else {
        testResults.profilesTable = {
          success: true,
          message: 'La tabla profiles existe y es accesible',
          count: data?.length || 0
        }
      }
    } catch (error) {
      testResults.profilesTable = {
        success: false,
        error: error,
        recommendation: 'Error de conexión a la base de datos'
      }
    }

    // Test 3: Intentar leer perfiles (si la tabla existe)
    if (testResults.profilesTable.success) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role')
          .limit(5)
        
        testResults.profilesData = {
          success: !error,
          data: data,
          error: error,
          count: data?.length || 0
        }
      } catch (error) {
        testResults.profilesData = {
          success: false,
          error: error
        }
      }
    }

    // Test 4: Verificar si tu usuario tiene perfil
    try {
      const { data: user } = await supabase.auth.getUser()
      
      if (user.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, email, role, created_at')
          .eq('id', user.user.id)
          .single()
        
        testResults.userProfile = {
          success: !error,
          data: profile,
          error: error,
          userId: user.user.id,
          userEmail: user.user.email
        }
      }
    } catch (error) {
      testResults.userProfile = {
        success: false,
        error: error
      }
    }

    // Test 5: Variables de entorno
    testResults.environment = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Falta',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Falta'
    }

    setResults(testResults)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔧 Diagnóstico de Base de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={runTests} disabled={loading}>
              {loading ? 'Ejecutando tests...' : 'Ejecutar Diagnóstico'}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-4">
            {/* Auth Connection */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-sm ${results.authConnection.success ? 'text-green-600' : 'text-red-600'}`}>
                  {results.authConnection.success ? '✅' : '❌'} Conexión de Autenticación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(results.authConnection, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Profiles Table */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-sm ${results.profilesTable.success ? 'text-green-600' : 'text-red-600'}`}>
                  {results.profilesTable.success ? '✅' : '❌'} Tabla Profiles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(results.profilesTable, null, 2)}
                </pre>
                {results.profilesTable.recommendation && (
                  <div className="mt-2 p-2 bg-yellow-100 rounded text-sm">
                    <strong>Recomendación:</strong> {results.profilesTable.recommendation}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profiles Data */}
            {results.profilesData && (
              <Card>
                <CardHeader>
                  <CardTitle className={`text-sm ${results.profilesData.success ? 'text-green-600' : 'text-red-600'}`}>
                    {results.profilesData.success ? '✅' : '❌'} Datos de Profiles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">Registros encontrados: {results.profilesData.count}</p>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(results.profilesData, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* User Profile */}
            {results.userProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className={`text-sm ${results.userProfile.success ? 'text-green-600' : 'text-red-600'}`}>
                    {results.userProfile.success ? '✅' : '❌'} Tu Perfil de Usuario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm mb-2">
                    <p><strong>Email:</strong> {results.userProfile.userEmail}</p>
                    <p><strong>ID:</strong> {results.userProfile.userId}</p>
                  </div>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(results.userProfile, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Environment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">🌍 Variables de Entorno</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(results.environment, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">💡 Próximos Pasos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {!results.profilesTable.success && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="font-semibold text-red-800">🚨 Problema Principal:</p>
                    <p>{results.profilesTable.recommendation}</p>
                    {results.profilesTable.details && (
                      <div className="mt-2 text-xs">
                        <p><strong>Código:</strong> {results.profilesTable.details.code}</p>
                        <p><strong>Mensaje:</strong> {results.profilesTable.details.message}</p>
                        {results.profilesTable.details.hint && (
                          <p><strong>Sugerencia:</strong> {results.profilesTable.details.hint}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {results.profilesTable.success && results.userProfile && !results.userProfile.success && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="font-semibold text-yellow-800">⚠️ Tu usuario no tiene perfil:</p>
                    <p>La tabla existe pero tu usuario no tiene un registro en profiles.</p>
                    <p className="mt-2">
                      <strong>Solución:</strong> Ejecuta este SQL en Supabase:
                    </p>
                    <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
                      INSERT INTO public.profiles (id, email, role) VALUES ('{results.userProfile.userId}', '{results.userProfile.userEmail}', 'athlete');
                    </code>
                  </div>
                )}
                
                {results.profilesTable.success && results.userProfile?.success && results.userProfile.data?.role !== 'master' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="font-semibold text-blue-800">ℹ️ Eres un atleta:</p>
                    <p>Tu perfil existe pero tienes rol de atleta.</p>
                    <p className="mt-2">
                      <strong>Para ser master:</strong> Ejecuta este SQL en Supabase:
                    </p>
                    <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
                      SELECT public.create_master_user('{results.userProfile.userEmail}');
                    </code>
                  </div>
                )}
                
                {results.profilesTable.success && results.userProfile?.success && results.userProfile.data?.role === 'master' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="font-semibold text-green-800">✅ Todo perfecto</p>
                    <p>Tu perfil existe y tienes rol de master. El problema debe ser temporal.</p>
                    <p className="mt-2">
                      <strong>Solución:</strong> Intenta cerrar sesión y volver a iniciar sesión.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
} 