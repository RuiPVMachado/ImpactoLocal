# Authentication Guide - VolunteerHub

Este guia descreve como implementar autenticação completa usando Supabase Auth na plataforma VolunteerHub.

## Configuração Inicial

### 1. Setup Supabase Client

O cliente já está configurado. Verificar que existe um ficheiro `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2. Variáveis de Ambiente

No ficheiro `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Implementação do AuthContext

O ficheiro `src/context/AuthContext.tsx` já tem a estrutura base. Implementar os métodos:

### 1. Registar Utilizador

```typescript
const register = async (email: string, password: string, name: string, type: 'volunteer' | 'organization') => {
  try {
    // 1. Criar utilizador no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          type
        }
      }
    });

    if (authError) throw authError;

    // 2. Criar perfil na tabela profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user!.id,
        email,
        name,
        type
      });

    if (profileError) throw profileError;

    // 3. Atualizar estado local
    setUser({
      id: authData.user!.id,
      email,
      name,
      type
    });

    return { success: true };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
};
```

### 2. Login

```typescript
const login = async (email: string, password: string) => {
  try {
    // 1. Fazer login no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;

    // 2. Buscar perfil do utilizador
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;

    // 3. Atualizar estado local
    setUser({
      id: profileData.id,
      email: profileData.email,
      name: profileData.name,
      type: profileData.type,
      avatar: profileData.avatar_url,
      phone: profileData.phone,
      bio: profileData.bio,
      location: profileData.location
    });

    return { success: true };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};
```

### 3. Logout

```typescript
const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setUser(null);
    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};
```

### 4. Verificar Sessão ao Carregar

```typescript
useEffect(() => {
  // Verificar sessão atual
  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Buscar perfil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setUser({
            id: profileData.id,
            email: profileData.email,
            name: profileData.name,
            type: profileData.type,
            avatar: profileData.avatar_url,
            phone: profileData.phone,
            bio: profileData.bio,
            location: profileData.location
          });
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  checkSession();

  // Subscrever a mudanças de autenticação
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        setUser({
          id: profileData.id,
          email: profileData.email,
          name: profileData.name,
          type: profileData.type,
          avatar: profileData.avatar_url,
          phone: profileData.phone,
          bio: profileData.bio,
          location: profileData.location
        });
      }
    } else if (event === 'SIGNED_OUT') {
      setUser(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## Protected Routes

Criar um componente para proteger rotas:

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTypes?: ('volunteer' | 'organization' | 'admin')[];
}

export default function ProtectedRoute({ children, allowedTypes }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedTypes && !allowedTypes.includes(user.type)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

Usar no App.tsx:

```typescript
<Route
  path="/create-event"
  element={
    <ProtectedRoute allowedTypes={['organization']}>
      <CreateEvent />
    </ProtectedRoute>
  }
/>
```

## Reset Password

### 1. Request Reset Email

```typescript
const requestPasswordReset = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
```

### 2. Reset Password Page

```typescript
// src/pages/ResetPassword.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('As passwords não coincidem');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      alert('Password alterada com sucesso!');
      navigate('/login');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">Redefinir Password</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Nova Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Confirmar Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'A redefinir...' : 'Redefinir Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Email Templates (Configurar no Supabase Dashboard)

### 1. Confirmação de Registo

```html
<h2>Bem-vindo ao VolunteerHub!</h2>
<p>Obrigado por te registares, {{ .Name }}!</p>
<p>Clica no link abaixo para confirmar o teu email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar Email</a></p>
```

### 2. Reset Password

```html
<h2>Redefinir Password</h2>
<p>Recebemos um pedido para redefinir a tua password.</p>
<p>Clica no link abaixo para criar uma nova password:</p>
<p><a href="{{ .ConfirmationURL }}">Redefinir Password</a></p>
<p>Se não fizeste este pedido, ignora este email.</p>
```

## Social Login (Opcional)

### Google OAuth

1. Configurar no Supabase Dashboard:
   - Authentication > Providers > Google
   - Adicionar Client ID e Secret

2. Implementar no frontend:

```typescript
const loginWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) console.error('Google login error:', error);
};
```

## Security Best Practices

1. **NUNCA** expor a service role key no frontend
2. Usar apenas a anon key no cliente
3. Implementar RLS (Row Level Security) em todas as tabelas
4. Validar inputs no frontend e backend
5. Usar HTTPS em produção
6. Implementar rate limiting para login attempts
7. Usar passwords fortes (mínimo 8 caracteres)
8. Implementar 2FA (opcional, mas recomendado)

## Troubleshooting

### Erro: "Invalid login credentials"
- Verificar que o email existe
- Verificar que a password está correta
- Verificar que o email foi confirmado (se email confirmation estiver ativo)

### Erro: "User already registered"
- Email já existe na base de dados
- Usar funcionalidade de reset password

### Sessão expira rapidamente
- Configurar refresh token no Supabase Dashboard
- Por defeito, sessões duram 1 hora e são renovadas automaticamente

### RLS Policy impede acesso
- Verificar que as policies estão corretas
- Usar `auth.uid()` nas policies para verificar utilizador
- Testar policies no SQL Editor do Supabase

## Testing Authentication

```typescript
// Testar registo
await register('test@example.com', 'password123', 'Test User', 'volunteer');

// Testar login
await login('test@example.com', 'password123');

// Testar logout
await logout();

// Testar sessão persistente
// Recarregar página e verificar que utilizador ainda está autenticado
```
