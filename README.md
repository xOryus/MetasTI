# Checklist Metas

Sistema de checklist diário com gestão de usuários e dashboard de métricas.

## Stack Tecnológica

- **Frontend**: Next.js 13 com TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Appwrite (Database + Auth + Storage)
- **Charts**: Recharts

## Funcionalidades

### Autenticação e Roles
- Login sem signup
- Admin especial via env vars
- Redirecionamento baseado em roles (admin, manager, collaborator)

### Admin Panel (`/admin`)
- CRUD completo de usuários
- Filtros por setor e role
- Criação via Appwrite Auth + perfil

### Checklist (`/home`)
- Submissão diária única
- Checkboxes + observação + upload de print
- Validação de arquivo obrigatório
- Bloqueio de múltiplas submissões

### Dashboard Colaborador (`/home`)
- Visualização de submissões pessoais
- Métricas de completion
- Gráfico de tendência semanal

### Dashboard Gestor (`/dashboard?sector=XYZ`)
- Métricas agregadas do setor
- Tabela de submissões recentes
- Gráficos de evolução

## Configuração

### 1. Variáveis de Ambiente

Copie `.env.local.example` para `.env.local` e configure:

```bash
NEXT_PUBLIC_APPWRITE_PROJECT_ID="seu_project_id"
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
APPWRITE_KEY="sua_chave_api"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="senha_admin"
```

### 2. Configuração Appwrite

No console do Appwrite, configure:

#### Database Collections:

1. **user_profiles**
   - `userId`: String (required)
   - `sector`: Enum (TI, RH, LOGISTICA, PORTARIA)
   - `role`: Enum (collaborator, manager, admin)

2. **submissions**
   - `userProfile`: Relationship (Many→One) → `user_profiles`
   - `date`: Datetime (required)
   - `answers`: String (JSON blob, required)
   - `observation`: String (optional)
   - `printFileId`: String (required)

#### Storage:
- Bucket `prints` configurado para uploads de imagem

### 3. Instalação

```bash
npm install
npm run dev
```

## Estrutura do Projeto

```
├── components/
│   ├── ChecklistForm.tsx    # Formulário de checklist
│   ├── Chart.tsx           # Gráficos reutilizáveis
│   ├── LoginForm.tsx       # Formulário de login
│   └── UserForm.tsx        # Formulário de usuário (admin)
├── hooks/
│   ├── useAuth.ts          # Hook de autenticação
│   └── useSubmissions.ts   # Hook de submissões
├── lib/
│   └── appwrite.ts         # Configuração Appwrite
├── pages/
│   ├── admin/
│   │   └── index.tsx       # Painel admin
│   ├── home/
│   │   └── index.tsx       # Dashboard colaborador
│   ├── dashboard.tsx       # Dashboard gestor
│   ├── login.tsx           # Página de login
│   └── index.tsx           # Página inicial
└── middleware.ts           # Proteção de rotas
```

## Fluxo de Autenticação

1. **Login** → Verifica se é admin especial ou usuário Appwrite
2. **Redirecionamento** → Baseado no role do usuário
3. **Proteção** → Middleware + hooks verificam autenticação
4. **Logout** → Limpa sessão e redireciona

## Tipos de Usuário

- **Admin**: Acesso total, CRUD de usuários
- **Manager**: Dashboard do setor, visualização de métricas
- **Collaborator**: Checklist pessoal, dashboard individual

## Desenvolvimento

- TypeScript em todos os arquivos
- Hooks reutilizáveis para lógica de negócio
- Componentes modulares
- Tratamento de erros consistente
- Loading states em todas as operações async

## Deploy

Configure as variáveis de ambiente no seu provedor de deploy e execute:

```bash
npm run build
npm start
```