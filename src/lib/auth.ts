import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  username: string
  name: string
  email: string
  role: 'admin' | 'trainer'
  is_active: boolean
}

export async function verifyCredentials(username: string, password: string): Promise<User | null> {
  try {
    // Buscar usuario por username
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      console.error('Error finding user:', error)
      return null
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!isValidPassword) {
      console.error('Invalid password for user:', username)
      return null
    }

    // Retornar usuario sin la contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error('Error in verifyCredentials:', error)
    return null
  }
}

export async function createUser(userData: {
  username: string
  password: string
  name: string
  email?: string
  role?: 'admin' | 'trainer'
}): Promise<User | null> {
  try {
    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(userData.password, 10)

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        password_hash: passwordHash,
        name: userData.name,
        email: userData.email,
        role: userData.role || 'trainer'
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return null
    }

    // Retornar usuario sin la contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error('Error in createUser:', error)
    return null
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      return null
    }

    // Retornar usuario sin la contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error('Error in getUserById:', error)
    return null
  }
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10)

    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId)

    if (error) {
      console.error('Error updating password:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateUserPassword:', error)
    return false
  }
} 