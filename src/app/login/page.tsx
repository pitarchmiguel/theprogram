'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Dumbbell, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isTimeout, setIsTimeout] = useState(false)
  const { signIn, loading: authLoading, error: authError } = useAuth()
  const supabase = createClient()

  // Timeout para carga de autenticación
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (authLoading) {
        setIsTimeout(true)
      }
    }, 15000) // 15 segundos timeout

    return () => clearTimeout(timeoutId)
  }, [authLoading])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)

      if (error) {
        setError('Credenciales incorrectas')
        toast.error('Error de autenticación')
      } else {
        toast.success('¡Bienvenido!')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Error de conexión')
      toast.error('Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name,
            role: 'athlete'
          }
        }
      })

      if (error) {
        setError(error.message)
        toast.error('Error en el registro')
      } else {
        toast.success('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.')
        // Reset form
        setName('')
        setEmail('')
        setPassword('')
        setIsLoginMode(true)
      }
    } catch (error) {
      console.error('Register error:', error)
      setError('Error de conexión')
      toast.error('Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = isLoginMode ? handleLogin : handleRegister

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Verificando sesión...</span>
          {authError && (
            <div className="text-center text-sm text-red-500 max-w-xs">
              <p>{authError}</p>
            </div>
          )}
          {(isTimeout || authError) && (
            <div className="text-center text-sm text-muted-foreground max-w-xs">
              <p>La verificación está tardando más de lo normal.</p>
              <div className="flex gap-2 mt-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reintentar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-primary rounded-full">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">The Program</CardTitle>
          <p className="text-muted-foreground">
            {isLoginMode ? 'Accede al panel de administración' : 'Regístrate como atleta'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 border border-destructive rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {!isLoginMode && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre"
                  required={!isLoginMode}
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresa tu email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
                disabled={isLoading}
                autoComplete={isLoginMode ? "current-password" : "new-password"}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isLoginMode ? 'Iniciando sesión...' : 'Registrando...'}
                </>
              ) : (
                isLoginMode ? 'Iniciar Sesión' : 'Registrarse'
              )}
            </Button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(!isLoginMode)
                  setError('')
                  setName('')
                  setEmail('')
                  setPassword('')
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLoginMode 
                  ? '¿No tienes cuenta? Regístrate aquí' 
                  : '¿Ya tienes cuenta? Inicia sesión aquí'
                }
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
