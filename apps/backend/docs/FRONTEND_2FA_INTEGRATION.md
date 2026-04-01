# 2FA Email - Frontend Integration Guide

## Overview

Este guia mostra como integrar 2FA por email no seu frontend. A implementação envolve dois fluxos principais:
1. **2FA no Login** — Código por email toda vez que faz login
2. **2FA na Conta** — Ativa/desativa 2FA permanente

---

## 🔧 Configuração

### Dependencies

Você provavelmente já tem isso:

```bash
npm install axios
# ou
npm install fetch  # se usar fetch nativo
```

### API Base URL

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
```

---

## 🔐 Fluxo 1: Login com 2FA

### Step 1: Login Padrão

```typescript
// 1. User entra email + senha
const response = await API.post('/auth/login', {
  identifier: 'user@example.com',  // email ou username
  password: 'Password123',
});

// Respostas possíveis:
// A) Sem 2FA ativado → accessToken direto
// B) Com 2FA ativado → requiresTwoFA: true, tempToken
```

### Step 2: Detectar se precisa 2FA

```typescript
if (response.data.requiresTwoFA) {
  // Mostrar tela para inserir código
  const tempToken = response.data.tempToken;
  
  // Solicitar envio de código por email
  await requestTwoFACode(email);
  
  // Mostrar form de verificação
  showTwoFAVerification(tempToken, email);
} else {
  // Login direto
  localStorage.setItem('token', response.data.data.accessToken);
  redirectToHome();
}
```

### Step 3: Solicitar Código

```typescript
// Enviar email com código
async function requestTwoFACode(email: string) {
  try {
    const response = await API.post('/auth/2fa/email/request', {
      email,
    });
    
    console.log('Código enviado para:', email);
    return response.data;
  } catch (error) {
    console.error('Erro ao solicitar código:', error.response?.data);
    // Mostrar erro ao usuário
  }
}
```

### Step 4: Validar Código

```typescript
// User entra código de 6 dígitos que recebeu no email
async function validate2FA(tempToken: string, code: string) {
  try {
    const response = await API.post('/auth/2fa/email/validate', {
      tempToken,
      code,
    });
    
    const { accessToken } = response.data.data;
    localStorage.setItem('token', accessToken);
    
    return response.data;
  } catch (error) {
    // Code inválido ou expirado
    if (error.response?.status === 401) {
      console.error('Código inválido ou expirado');
    }
    throw error;
  }
}
```

### Componente React - Login com 2FA

```typescript
import React, { useState } from 'react';
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000',
});

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await API.post('/auth/login', {
        identifier: email,
        password,
      });

      if (res.data.requiresTwoFA) {
        // Requer 2FA
        setTempToken(res.data.tempToken);
        
        // Solicitar código
        await API.post('/auth/2fa/email/request', { email });
        
        setStep('2fa');
      } else {
        // Login direto (sem 2FA)
        localStorage.setItem('token', res.data.data.accessToken);
        window.location.href = '/home';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await API.post('/auth/2fa/email/validate', {
        tempToken,
        code,
      });

      localStorage.setItem('token', res.data.data.accessToken);
      window.location.href = '/home';
    } catch (err: any) {
      setError('Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await API.post('/auth/2fa/email/request', { email });
      setError('');
      alert('Novo código enviado para ' + email);
    } catch (err) {
      setError('Erro ao re-enviar código');
    } finally {
      setLoading(false);
    }
  };

  if (step === '2fa') {
    return (
      <div className="login-container">
        <h2>Verificação 2FA</h2>
        <p>Digite o código enviado para {email}</p>
        
        <form onSubmit={handleValidate2FA}>
          <input
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 6))}
            maxLength={6}
            pattern="\d{6}"
            disabled={loading}
          />
          
          <button type="submit" disabled={loading || code.length !== 6}>
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button onClick={handleResendCode} disabled={loading}>
            Re-enviar código
          </button>
          <button onClick={() => setStep('login')}>
            Voltar
          </button>
        </div>

        <p className="hint">O código expira em 10 minutos</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h2>Login</h2>
      
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email ou username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

---

## 🛡️ Fluxo 2: Ativar 2FA na Conta

### Step 1: Iniciar Setup

```typescript
// User está logado, clica em "Ativar 2FA"
async function enable2FASetup(token: string) {
  try {
    const response = await API.post(
      '/auth/2fa/email/enable',
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    console.log('Código foi enviado para seu email');
    return response.data;
  } catch (error) {
    console.error('Erro ao ativar 2FA:', error.response?.data);
  }
}
```

### Step 2: Confirmar com Código

```typescript
async function confirm2FA(token: string, code: string) {
  try {
    const response = await API.post(
      '/auth/2fa/email/confirm',
      { code },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    console.log('2FA ativado com sucesso!');
    return response.data;
  } catch (error) {
    console.error('Código inválido:', error.response?.data);
  }
}
```

### Componente React - Settings 2FA

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000',
});

export function Security2FASettings({ userToken }: { userToken: string }) {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'init' | 'confirm' | 'disable'>('init');

  useEffect(() => {
    // Buscar status atual de 2FA
    fetchUser2FAStatus();
  }, []);

  const fetchUser2FAStatus = async () => {
    try {
      const res = await API.get('/auth/me', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setIs2FAEnabled(res.data.data.twoFAEnabled);
    } catch (error) {
      console.error('Erro ao buscar status 2FA', error);
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    setError('');

    try {
      await API.post('/auth/2fa/email/enable', {}, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      setStep('confirm');
      setShowSetupModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao ativar 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = async () => {
    setLoading(true);
    setError('');

    try {
      await API.post('/auth/2fa/email/confirm', { code }, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      setIs2FAEnabled(true);
      setShowSetupModal(false);
      setCode('');
      alert('2FA ativado com sucesso!');
    } catch (err: any) {
      setError('Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Tem certeza que deseja desativar 2FA?')) return;

    setLoading(true);
    setError('');

    try {
      // Primeira chamada: solicita código
      await API.post('/auth/2fa/email/disable', {}, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      setStep('disable');
      setShowSetupModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao desativar 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDisable = async () => {
    setLoading(true);

    try {
      // Segunda chamada: confirma desabilitação
      await API.post(
        '/auth/2fa/email/disable',
        { code },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      setIs2FAEnabled(false);
      setShowSetupModal(false);
      setCode('');
      alert('2FA desativado com sucesso!');
    } catch (err: any) {
      setError('Código inválido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="security-settings">
      <h3>Autenticação de 2 Fatores</h3>

      <div className="status">
        <p>
          Status: {is2FAEnabled ? (
            <span className="enabled">✓ Ativado</span>
          ) : (
            <span className="disabled">✗ Desativado</span>
          )}
        </p>
      </div>

      <div className="actions">
        {!is2FAEnabled ? (
          <button onClick={handleEnable} disabled={loading}>
            {loading ? 'Ativando...' : 'Ativar 2FA'}
          </button>
        ) : (
          <button onClick={handleDisable} disabled={loading} className="danger">
            {loading ? 'Desativando...' : 'Desativar 2FA'}
          </button>
        )}
      </div>

      {/* Modal de Confirmação */}
      {showSetupModal && (
        <div className="modal">
          <div className="modal-content">
            {step === 'confirm' && (
              <>
                <h4>Confirmar Ativação</h4>
                <p>Digit o código que foi enviado para seu email:</p>
                <input
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.slice(0, 6))}
                  maxLength={6}
                  disabled={loading}
                />
                <button
                  onClick={handleSubmitCode}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? 'Verificando...' : 'Confirmar'}
                </button>
              </>
            )}

            {step === 'disable' && (
              <>
                <h4>Confirmar Desabilitação</h4>
                <p>Digite o código enviado para desativar 2FA:</p>
                <input
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.slice(0, 6))}
                  maxLength={6}
                  disabled={loading}
                />
                <button
                  onClick={handleConfirmDisable}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? 'Verificando...' : 'Desativar'}
                </button>
              </>
            )}

            {error && <p className="error">{error}</p>}

            <button
              onClick={() => {
                setShowSetupModal(false);
                setCode('');
                setError('');
              }}
              className="close"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📱 Exemplo com Fetch (Sem Axios)

```typescript
const API_URL = 'http://localhost:3000';

// Login
async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });

  return res.json();
}

// Request 2FA Code
async function request2FACode(email: string) {
  const res = await fetch(`${API_URL}/auth/2fa/email/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return res.json();
}

// Validate 2FA
async function validate2FA(tempToken: string, code: string) {
  const res = await fetch(`${API_URL}/auth/2fa/email/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken, code }),
  });

  return res.json();
}

// Enable 2FA
async function enable2FA(token: string) {
  const res = await fetch(`${API_URL}/auth/2fa/email/enable`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.json();
}

// Confirm 2FA
async function confirm2FA(token: string, code: string) {
  const res = await fetch(`${API_URL}/auth/2fa/email/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });

  return res.json();
}
```

---

## 🎨 UI/UX Recommendations

### 1. **Tela de Login com 2FA**
```
┌─────────────────────────────┐
│     LOGIN VERIFICATION       │
│                              │
│  We've sent a code to:       │
│  user@example.com            │
│                              │
│  ┌──────────────────────┐    │
│  │  [  ][  ][  ][  ][  ]│    │  6-digit input
│  └──────────────────────┘    │
│                              │
│       [VERIFY BUTTON]        │
│                              │
│   Didn't receive? [RESEND]   │
│   [BACK TO LOGIN]            │
│                              │
│   ⏱️ Code expires in 10m     │
└─────────────────────────────┘
```

### 2. **Settings - 2FA Status**
```
┌─────────────────────────────┐
│   SECURITY SETTINGS          │
│                              │
│  Two-Factor Authentication   │
│  ├─ Status: ● ENABLED        │
│  ├─ Method: Email            │
│  └─ Code length: 6 digits    │
│                              │
│     [DISABLE 2FA]            │
│                              │
│  📧 Codes are sent to:       │
│     user@example.com         │
└─────────────────────────────┘
```

### 3. **Error States**
```
Input: "12345"  (incompleto)
Button: [VERIFY] (desabilitado)

Input: "123456" (válido)
Button: [VERIFY] (ativado)

Erro: "Code expired - request a new one"
Erro: "Invalid code - try again"
```

---

## ✅ Checklist de Implementação

- [ ] Instalar `nodemailer` na notification-service
- [ ] Configurar SMTP em `.env`
- [ ] Criar serviço de API (`api.ts` ou similar)
- [ ] Componente de Login com 2FA
- [ ] Componente de Settings 2FA
- [ ] Tratamento de erros
- [ ] Loading states
- [ ] Persist token em localStorage/cookies
- [ ] Logout ao tokens expirarem
- [ ] Testes manuais

---

## 🧪 Testes

### Test 1: Login Sem 2FA
1. User sem 2FA habilitado faz login
2. Expectado: Recebe `accessToken` direto

### Test 2: Login Com 2FA
1. User com 2FA habilitado faz login
2. Expectado: Recebe `tempToken` e `requiresTwoFA: true`
3. Solicita código
4. Entra código no formulário
5. Expectado: Recebe `accessToken`

### Test 3: Ativar 2FA
1. User autenticado clica "Ativar 2FA"
2. Recebe código no email
3. Entra código no form
4. Expectado: 2FA agora está ativado

### Test 4: Código Inválido
1. User entra código errado
2. Expectado: Erro "Invalid code"

### Test 5: Código Expirado
1. Aguarda 10+ minutos
2. Tenta entrar código
3. Expectado: Erro "Code expired"

---

## 🚀 Estado Global (Context/Redux)

Se usar Context:

```typescript
// AuthContext.ts
import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [tempToken, setTempToken] = useState(null);
  const [requires2FA, setRequires2FA] = useState(false);

  const login = async (identifier, password) => {
    const res = await loginAPI(identifier, password);
    
    if (res.requiresTwoFA) {
      setRequires2FA(true);
      setTempToken(res.tempToken);
      return { requiresTwoFA: true };
    }

    setToken(res.data.accessToken);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.accessToken);
    return { success: true };
  };

  const validate2FA = async (code) => {
    const res = await validate2FAAPI(tempToken, code);
    
    setToken(res.data.accessToken);
    setUser(res.data.user);
    setRequires2FA(false);
    setTempToken(null);
    localStorage.setItem('token', res.data.accessToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        requires2FA,
        login,
        validate2FA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 📞 Suporte

Para dúvidas sobre a API, veja: [docs/2FA_EMAIL_SETUP.md](../docs/2FA_EMAIL_SETUP.md)
