/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabaseClient'

export default function TestConnectionPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

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
      const { error } = await supabase
        .from('profiles')
        .select('count(*)')
        .limit(1)
      
      if (error) {
        testResults.profilesTable = {
          success: false,
          error: `Error: ${error.message} (Code: ${error.code})`,
          recommendation: error.code === '42P01' ? 
            'La tabla "profiles" no existe. Necesitas ejecutar el SQL de setup.' :
            'Hay un problema con la tabla profiles.'
        }
      } else {
        testResults.profilesTable = {
          success: true,
          message: 'La tabla profiles existe y es accesible'
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

    // Test 4: Variables de entorno
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
                    <p>La tabla "profiles" no existe. Necesitas ejecutar el SQL de setup en Supabase.</p>
                    <p className="mt-2">
                      <strong>Solución:</strong> Ejecuta el archivo <code>scripts/setup-database.sql</code> en el SQL Editor de Supabase.
                    </p>
                  </div>
                )}
                
                {results.profilesTable.success && results.profilesData.count === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="font-semibold text-yellow-800">⚠️ La tabla existe pero está vacía:</p>
                    <p>Los usuarios se crearán automáticamente cuando se registren.</p>
                  </div>
                )}
                
                {results.profilesTable.success && results.profilesData.count > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="font-semibold text-green-800">✅ Todo está funcionando correctamente</p>
                    <p>La tabla profiles existe y tiene datos. El error debe ser temporal.</p>
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