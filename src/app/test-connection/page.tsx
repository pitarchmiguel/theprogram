'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function TestConnectionPage() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [testData, setTestData] = useState<any>(null)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      setConnectionStatus('loading')
      setErrorMessage('')

      // Test 1: Verificar que las variables de entorno estén configuradas
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !key) {
        throw new Error('Variables de entorno no configuradas')
      }

      // Test 2: Intentar conectar con Supabase
      const { data, error } = await supabase
        .from('workouts')
        .select('count')
        .limit(1)

      if (error) {
        throw error
      }

      setConnectionStatus('success')
      setTestData({
        url: url.substring(0, 30) + '...',
        hasKey: !!key,
        keyLength: key.length,
        tableAccess: 'OK'
      })

    } catch (error: any) {
      setConnectionStatus('error')
      setErrorMessage(error.message || 'Error desconocido')
      console.error('Error de conexión:', error)
    }
  }

  const testInsert = async () => {
    try {
      const testWorkout = {
        date: new Date().toISOString().split('T')[0],
        blocks: [
          {
            id: 'test-1',
            letter: 'T',
            title: 'Test Workout',
            description: 'Este es un entrenamiento de prueba',
            notes: 'Para verificar la conexión'
          }
        ]
      }

      const { data, error } = await supabase
        .from('workouts')
        .insert([testWorkout])
        .select()

      if (error) {
        throw error
      }

      alert('¡Test de inserción exitoso! Se creó un entrenamiento de prueba.')
      testConnection() // Recargar datos

    } catch (error: any) {
      alert(`Error en test de inserción: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Test de Conexión Supabase</h1>
          <p className="text-muted-foreground">
            Verificando la configuración de la base de datos
          </p>
        </div>

        {/* Estado de conexión */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Estado de Conexión
              {connectionStatus === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
              {connectionStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {connectionStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectionStatus === 'loading' && (
              <p>Verificando conexión...</p>
            )}

            {connectionStatus === 'success' && (
              <div className="space-y-2">
                <Badge variant="secondary" className="w-full justify-center">
                  ✅ Conexión exitosa
                </Badge>
                {testData && (
                  <div className="text-sm space-y-1">
                    <p><strong>URL:</strong> {testData.url}</p>
                    <p><strong>Clave configurada:</strong> {testData.hasKey ? '✅' : '❌'}</p>
                    <p><strong>Longitud de clave:</strong> {testData.keyLength} caracteres</p>
                    <p><strong>Acceso a tabla:</strong> {testData.tableAccess}</p>
                  </div>
                )}
              </div>
            )}

            {connectionStatus === 'error' && (
              <div className="space-y-2">
                <Badge variant="destructive" className="w-full justify-center">
                  ❌ Error de conexión
                </Badge>
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <Button 
            onClick={testConnection} 
            className="flex-1"
            disabled={connectionStatus === 'loading'}
          >
            {connectionStatus === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Probando...
              </>
            ) : (
              'Probar Conexión'
            )}
          </Button>

          {connectionStatus === 'success' && (
            <Button 
              onClick={testInsert} 
              variant="outline"
              className="flex-1"
            >
              Test Insertar
            </Button>
          )}
        </div>

        {/* Instrucciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Solución de problemas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium">Si hay error de conexión:</h4>
              <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
                <li>Verifica que el archivo .env.local existe</li>
                <li>Comprueba que las credenciales son correctas</li>
                <li>Asegúrate de que la tabla 'workouts' existe</li>
                <li>Revisa que RLS esté configurado correctamente</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">Variables de entorno necesarias:</h4>
              <code className="block bg-muted p-2 rounded mt-2 text-xs">
                NEXT_PUBLIC_SUPABASE_URL=tu_url<br/>
                NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 