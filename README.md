# 🎯 MetasTI - Sistema de Gestão de Metas e Recompensas

> **Sistema inteligente de metas individuais e setoriais com recompensas monetárias automáticas**

[![Next.js](https://img.shields.io/badge/Next.js-15.4.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Appwrite](https://img.shields.io/badge/Appwrite-13.0-orange)](https://appwrite.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38B2AC)](https://tailwindcss.com/)

---

## 🚀 Visão Geral

O **MetasTI** é um sistema completo de gestão de metas que permite criar, acompanhar e recompensar colaboradores automaticamente. Com interface moderna e lógica inteligente, o sistema calcula recompensas monetárias baseadas no desempenho real dos colaboradores.

### ✨ Principais Funcionalidades

- 🎯 **Metas Individuais e Setoriais**
- 💰 **Recompensas Monetárias Automáticas**
- 📊 **Dashboards Inteligentes**
- 🔄 **Períodos Dinâmicos** (Diário, Semanal, Mensal, Trimestral, Anual)
- 👥 **Gestão de Usuários por Setor**
- 📈 **Métricas de Performance em Tempo Real**

---

## 🏗️ Arquitetura

### Stack Tecnológica

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Next.js** | 15.4.1 | Framework React com SSR |
| **TypeScript** | 5.0 | Tipagem estática |
| **Appwrite** | 13.0 | Backend-as-a-Service |
| **Tailwind CSS** | 3.3 | Styling utilitário |
| **shadcn/ui** | Latest | Componentes UI |
| **Recharts** | Latest | Gráficos interativos |

### Estrutura do Projeto

```
metasTI/
├── 📁 components/          # Componentes reutilizáveis
│   ├── 📄 ChecklistForm.tsx
│   ├── 📄 Chart.tsx
│   ├── 📄 LoginForm.tsx
│   └── 📄 UserForm.tsx
├── 📁 hooks/              # Lógica de negócio
│   ├── 📄 useAuth.ts
│   ├── 📄 useSubmissions.ts
│   └── 📄 useSectorGoals.ts
├── 📁 lib/                # Configurações e utilitários
│   ├── 📄 appwrite.ts
│   ├── 📄 rewards.ts
│   └── 📄 currency.ts
├── 📁 pages/              # Páginas da aplicação
│   ├── 📁 admin/          # Painel administrativo
│   ├── 📁 home/           # Dashboard colaborador
│   └── 📄 dashboard.tsx   # Dashboard gestor
└── 📄 middleware.ts       # Proteção de rotas
```

---

## 🎯 Guia Completo - Como Lançar Metas Corretamente

### 📋 Tipos de Meta Disponíveis

#### 1. **Conclusão de Tarefa (Sim/Não)** ✅
**Para que serve**: Tarefas simples que são feitas ou não
- **Exemplo**: "Entregar relatório diário", "Participar da reunião"
- **Como funciona**: Colaborador marca como "Sim" quando completa
- **Recompensa**: Paga quando marca como "Sim"

#### 2. **Meta Numérica** 📊
**Para que serve**: Objetivos com valores acumulativos
- **Exemplo**: "5 contratações no mês", "10 vendas por semana"
- **Como funciona**: Colaborador soma valores (ex: 2+3=5 contratações)
- **Recompensa**: Paga quando atinge o valor alvo

#### 3. **Meta de Porcentagem** 📈
**Para que serve**: Objetivos percentuais
- **Exemplo**: "80% de satisfação do cliente", "90% de produtividade"
- **Como funciona**: Colaborador informa a porcentagem atual
- **Recompensa**: Paga quando atinge a porcentagem alvo

#### 4. **Checklist (Múltiplas Tarefas)** 📝
**Para que serve**: Lista de tarefas que precisam ser todas completadas
- **Exemplo**: "Checklist de onboarding", "Lista de verificações"
- **Como funciona**: Colaborador marca todas as tarefas como "Sim"
- **Recompensa**: Paga quando todas as tarefas estão marcadas

### 📅 Períodos Disponíveis

| Período | Duração | Quando Paga | Exemplo |
|---------|---------|-------------|---------|
| **Diário** | 1 dia (24h) | Final do dia | "Entregar relatório diário" |
| **Semanal** | 7 dias | Final da semana | "10 vendas por semana" |
| **Mensal** | Mês completo | Final do mês | "5 contratações no mês" |
| **Trimestral** | 3 meses | Final do trimestre | "Meta trimestral de vendas" |
| **Anual** | 1 ano | Final do ano | "Meta anual de crescimento" |

### 💰 Recompensas Monetárias

#### **Configuração:**
1. ✅ **Ativar**: Marcar "Adicionar recompensa monetária"
2. 💵 **Valor**: Inserir valor em centavos (ex: R$400 = 40000)
3. 🏦 **Moeda**: BRL (Real brasileiro)

#### **Regras de Pagamento:**
- ✅ **Metas atingidas**: Paga o valor completo
- ❌ **Metas não atingidas**: Não paga nada
- ⚠️ **Metas excedidas**: Paga apenas o valor alvo (não paga excedente)

### 🔄 Fluxos Práticos por Tipo

#### **📅 Tarefas Diárias (Rotina)**
```
1. Criar meta: "Entregar relatório diário"
2. Tipo: Conclusão de Tarefa
3. Período: Diário
4. Recompensa: R$50
5. Colaborador marca como "Sim" no dia
6. Sistema paga R$50 no final do dia
```

#### **📊 Metas Numéricas (Mensais)**
```
1. Criar meta: "5 contratações no mês"
2. Tipo: Meta Numérica
3. Valor alvo: 5
4. Período: Mensal
5. Recompensa: R$400
6. Colaborador envia: 2+3=5 contratações
7. Sistema paga R$400 no final do mês
```

#### **📈 Metas de Porcentagem (Semanais)**
```
1. Criar meta: "80% de satisfação"
2. Tipo: Meta de Porcentagem
3. Valor alvo: 80
4. Período: Semanal
5. Recompensa: R$200
6. Colaborador informa: 85%
7. Sistema paga R$200 no final da semana
```

### 🚀 Fluxo Recomendado para Produção

#### **1. Metas Diárias (Rotina)** 🏃‍♂️
- **Tipo**: Conclusão de Tarefa
- **Período**: Diário
- **Recompensa**: R$20-50
- **Exemplo**: Relatórios, presença, tarefas básicas

#### **2. Metas Semanais (Performance)** 📈
- **Tipo**: Meta Numérica ou Porcentagem
- **Período**: Semanal
- **Recompensa**: R$100-300
- **Exemplo**: Vendas, produtividade, qualidade

#### **3. Metas Mensais (Objetivos)** 🎯
- **Tipo**: Meta Numérica
- **Período**: Mensal
- **Recompensa**: R$300-800
- **Exemplo**: Contratações, vendas mensais, projetos

### ✅ Checklist para Lançar Meta

- [ ] **Título claro e específico**
- [ ] **Tipo correto selecionado**
- [ ] **Escopo: Individual**
- [ ] **Setor correto**
- [ ] **Período adequado**
- [ ] **Usuário atribuído**
- [ ] **Recompensa monetária ativada**
- [ ] **Valor em centavos**
- [ ] **Meta ativa**

---

## 👥 Tipos de Usuário

| Role | Acesso | Funcionalidades |
|------|--------|-----------------|
| **👑 Admin** | Total | CRUD de usuários, gestão de metas |
| **👔 Manager** | Setor | Dashboard do setor, visualização de métricas |
| **👤 Collaborator** | Individual | Checklist pessoal, dashboard individual |

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Copie `.env.local.example` para `.env.local`:

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_PROJECT_ID="seu_project_id"
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
APPWRITE_KEY="sua_chave_api"

# Admin Configuration
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="senha_admin"
```

### 2. Configuração Appwrite

#### **Database Collections:**

**user_profiles**
```json
{
  "userId": "String (required)",
  "sector": "Enum (TI, RH, LOGISTICA, PORTARIA)",
  "role": "Enum (collaborator, manager, admin)"
}
```

**submissions**
```json
{
  "userProfile": "Relationship (Many→One) → user_profiles",
  "date": "Datetime (required)",
  "answers": "String (JSON blob, required)",
  "observation": "String (optional)",
  "printFileId": "String (required)"
}
```

**sector_goals**
```json
{
  "title": "String (required)",
  "description": "String (required)",
  "sectorId": "String (required)",
  "type": "Enum (task_completion, numeric, percentage, boolean_checklist)",
  "targetValue": "Number (required)",
  "period": "Enum (daily, weekly, monthly, quarterly, yearly)",
  "scope": "Enum (individual, sector)",
  "assignedUserId": "String (for individual goals)",
  "hasMonetaryReward": "Boolean",
  "monetaryValue": "Number (in cents)",
  "isActive": "Boolean"
}
```

#### **Storage:**
- Bucket `prints` configurado para uploads de imagem

### 3. Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/metasTI.git
cd metasTI

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.local.example .env.local

# Execute em desenvolvimento
npm run dev
```

---

## 🔐 Autenticação e Segurança

### Fluxo de Autenticação

1. **Login** → Verifica se é admin especial ou usuário Appwrite
2. **Redirecionamento** → Baseado no role do usuário
3. **Proteção** → Middleware + hooks verificam autenticação
4. **Logout** → Limpa sessão e redireciona

### Middleware de Proteção

- ✅ **Rotas protegidas** por role
- ✅ **Redirecionamento automático** para login
- ✅ **Validação de sessão** em tempo real

---

## 📊 Dashboards e Métricas

### Dashboard Colaborador
- 📈 **Progresso pessoal** em tempo real
- 🎯 **Metas individuais** e status
- 💰 **Recompensas ganhas** e pendentes
- 📅 **Histórico de submissões**

### Dashboard Gestor
- 📊 **Métricas agregadas** do setor
- 👥 **Performance dos colaboradores**
- 💰 **Recompensas pendentes** para pagamento
- 📈 **Tendências e alertas**

### Dashboard Admin
- 👥 **Gestão completa** de usuários
- 🎯 **Criação e edição** de metas
- 📊 **Métricas globais** da empresa
- ⚙️ **Configurações** do sistema

---

## 🚀 Deploy

### Preparação para Produção

```bash
# Build da aplicação
npm run build

# Teste local da build
npm start
```

### Variáveis de Ambiente para Produção

Configure as seguintes variáveis no seu provedor de deploy:

```bash
NEXT_PUBLIC_APPWRITE_PROJECT_ID="seu_project_id_producao"
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
APPWRITE_KEY="sua_chave_api_producao"
ADMIN_EMAIL="admin@empresa.com"
ADMIN_PASSWORD="senha_segura_producao"
```

---

## 🤝 Contribuição

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 📞 Suporte

- 📧 **Email**: suporte@metasti.com
- 📱 **Telegram**: @MetasTI_Support
- 📖 **Documentação**: [docs.metasti.com](https://docs.metasti.com)

---

<div align="center">

**MetasTI** - Transformando metas em resultados! 🎯

*Desenvolvido com ❤️ pela equipe MetasTI*

</div>