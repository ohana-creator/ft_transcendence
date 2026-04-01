## ✅ 2FA Email Implementation Complete

Implementei um sistema completo de **2FA por email com código de 6 dígitos aleatório**. Aqui está o resumo do que foi feito:

---

## 🚀 Como Usar

### 1. **Configurar Email (SMTP)**

Edite seu `.env` com as credenciais SMTP:

```env
SMTP_HOST=smtp.gmail.com          # ou seu servidor SMTP
SMTP_PORT=587                     # 587 (TLS) ou 465 (SSL)
SMTP_USER=seu-email@gmail.com     
SMTP_PASSWORD=sua-app-password    # Para Gmail, use App Password
SMTP_FROM=noreply@ft-transcendence.com
```

**Para Gmail:**
- Ative 2FA: https://accounts.google.com/security
- Gere App Password: https://myaccount.google.com/apppasswords
- Cole a senha gerada em `SMTP_PASSWORD`

### 2. **Fluxo: 2FA no Login**

```bash
# 1. Login com email/senha
POST /auth/login
{
  "identifier": "user@example.com",
  "password": "MyPassword123"
}
# Resposta: requiresTwoFA: true, tempToken: "..."

# 2. Solicitar código por email
POST /auth/2fa/email/request
{
  "email": "user@example.com"
}
# Usuário recebe código no email (expira em 10 min)

# 3. Validar código recebido
POST /auth/2fa/email/validate
{
  "tempToken": "...",
  "code": "123456"
}
# Resposta: accessToken! Login completo!
```

### 3. **Ativar 2FA Permanente na Conta**

```bash
# 1. Solicitar ativação (com JWT autenticado)
POST /auth/2fa/email/enable
Authorization: Bearer <seu_jwt>

# Recebe código no email (expira em 15 min)

# 2. Confirmar com código
POST /auth/2fa/email/confirm
Authorization: Bearer <seu_jwt>
{
  "code": "123456"
}
# Pronto! 2FA agora é obrigatório em todo login
```

### 4. **Desativar 2FA da Conta**

```bash
# 1. Solicitar desativação (com JWT)
POST /auth/2fa/email/disable
Authorization: Bearer <seu_jwt>

# Recebe código no email

# 2. Confirmar desativação
POST /auth/2fa/email/disable
Authorization: Bearer <seu_jwt>
{
  "code": "123456"
}
```

---

## 📋 O Que Foi Implementado

### Código Backend

| Arquivo | Mudança |
|---------|---------|
| `auth-service/prisma/schema.prisma` | ✅ Campos: `twoFAEmailCode`, `twoFAEmailExpiresAt` |
| `auth-service/src/auth/auth.service.ts` | ✅ 5 novos métodos para 2FA email |
| `auth-service/src/auth/auth.controller.ts` | ✅ 5 novos endpoints |
| `auth-service/src/auth/dto/two-fa-email.dto.ts` | ✅ DTOs de validação |
| `notification-service/src/notifications/email.service.ts` | ✅ Serviço SMTP completo |
| `notification-service/src/events/event-consumer.service.ts` | ✅ Handlers de email |
| `notification-service/package.json` | ✅ nodemailer + @types/nodemailer |

### Migração Banco de Dados

- Criada em: `auth-service/prisma/migrations/add_2fa_email_fields/migration.sql`
- Será executada automaticamente quando o container subir (entrypoint.dev.sh)

### Documentação

- 📖 `docs/2FA_EMAIL_SETUP.md` — Guia completo com exemplos cURL
- `env.example` — Variáveis SMTP documentadas

---

## 🔄 Fluxo de Eventos

```
User → Auth Service
  ├─ Gera código de 6 dígitos
  ├─ Armazena com expiração
  └─ Publica evento: "2fa.email.code-generated"
        ↓
  Notification Service (event-consumer)
  ├─ Recebe evento
  ├─ Cria notificação in-app
  └─ EmailService.send2FACode()
        ↓
  User recebe email com código (máx 10 min)
```

---

## 🛡️ Segurança

✅ **Rate Limiting:**
- 5 tentativas/min para validação
- 3 tentativas/min para solicitar código

✅ **Expiração de Código:**
- Login: 10 minutos
- Setup: 15 minutos
- Disable: 10 minutos

✅ **Tokens Temporários:**
- 5 minutos de validade (para login)

---

## ⚡ Testes Rápidos

### 1. Teste local sem email real
Deixe `SMTP_HOST` vazio. Os logs mostrarão:
```
[EmailService] Email not sent (transporter not configured) to user@example.com
[Logger] 2FA code email sent to user@example.com
```

### 2. Teste com Mailtrap (fake SMTP)
```env
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=<seu-user-mailtrap>
SMTP_PASSWORD=<seu-password-mailtrap>
```

Acesse https://mailtrap.io para ver emails recebidos.

### 3. Teste com Gmail real
Siga o passo 1 da seção "Usar" acima.

---

## 📚 Endpoints Disponíveis

### 🔓 Sem Autenticação
- `POST /auth/2fa/email/request` — Solicitar código (login)
- `POST /auth/2fa/email/validate` — Validar código (login)

### 🔐 Com Autenticação (Bearer Token)
- `POST /auth/2fa/email/enable` — Iniciar setup de 2FA
- `POST /auth/2fa/email/confirm` — Confirmar setup
- `POST /auth/2fa/email/disable` — Iniciar desativação
- `POST /auth/2fa/email/disable` + código — Confirmar desativação

---

## 🚢 Deploy/Iniciar Servidor

```bash
# 1. Editar .env com SMTP
# 2. Subir containers
docker compose up -d

# Esperado:
# ✔ auth-service: Migração executada
# ✔ notification-service: EmailService pronto
# ✔ API Endpoints disponíveis
```

---

## 🐛 Troubleshooting

**"Email not sent"?**
- Verifique `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` em `.env`
- Restart notification-service: `docker restart notification-service`

**Código expirando rápido?**
- Edite timeout em `auth.service.ts` (linhas com `Date.now() + 10 * 60 * 1000`)

**Migração falhando?**
- Delete volume: `docker volume rm trans_auth_data`
- Restart: `docker compose down && docker compose up -d`

---

✨ **Sistema pronto para usar!** Qualquer dúvida é só chamar!
