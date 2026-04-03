# FASE 3: Desktop App + Offline-First Architecture
**Data:** 2026-04-02  
**Objetivo:** Transformar SaaS web em Desktop App instalável com sincronização offline  
**Status:** Planning → Implementation  
**Target Score:** 9.3/10 (Enterprise-Ready Desktop)

---

## 📋 O QUE VAMOS FAZER

### Transformação:
```
HOJE (SaaS Web):                  AMANHÃ (Desktop Offline-First):
┌─────────────┐                   ┌──────────────────────┐
│ Navegador   │                   │ .exe Instalável      │
│ ↓           │                   │ ↓                    │
│ Supabase    │                   │ React + Electron     │
│ (só online) │                   │ ↓                    │
│ ❌ Sem wifi │                   │ SQLite Local         │
└─────────────┘                   │ ↓                    │
                                  │ Sync Engine          │
                                  │ (online ↔ offline)   │
                                  │ ✅ Trabalha sempre   │
                                  └──────────────────────┘
```

### Benefícios:
- ✅ **Offline primário**: Funciona sem internet
- ✅ **Sync automático**: Quando volta online, sincroniza sozinho
- ✅ **Zero perda de dados**: Fila local aguarda conexão
- ✅ **Instalação local**: Um .exe, clica, pronto
- ✅ **Mesma UI**: Reutiliza toda React atual

---

## 🏗️ ARQUITETURA TÉCNICA

### Stack:
```
Frontend:     React 18 (já existe)
Desktop:      Electron 33
Database:     SQLite 3 (local) + Supabase (remote)
Sync:         Custom bidirectional sync engine
Auth:         Supabase Auth (local cache)
Storage:      Local filesystem + Indexed DB
Build:        electron-builder (.exe/.dmg)
```

### Estrutura de Pastas:
```
pcm-estrategico/
├── src/
│   ├── electron/              ⭐ NOVO
│   │   ├── main.ts            → Electron main process
│   │   ├── preload.ts         → Context bridge
│   │   └── ipc/               → IPC handlers
│   │       ├── sync.ts        → Sync engine handlers
│   │       ├── database.ts    → SQLite handlers
│   │       └── auth.ts        → Auth handlers
│   ├── db/                    ⭐ NOVO
│   │   ├── schema.ts          → SQLite schema (mirror Supabase)
│   │   ├── migrations.ts      → Local DB migrations
│   │   └── sqlite.ts          → SQLite client wrapper
│   ├── sync/                  ⭐ NOVO
│   │   ├── engine.ts          → Main sync logic
│   │   ├── queue.ts           → Pending operations queue
│   │   ├── conflict.ts        → Conflict resolution
│   │   └── transforms.ts      → Data transformations
│   ├── hooks/
│   │   └── useOfflineSync.ts  ⭐ NOVO → React hook para status sync
│   └── ...rest (mantém igual)
├── electron/                  ⭐ NOVO
│   ├── preload.ts
│   └── main.ts
└── package.json               (add Electron dependencies)
```

---

## 📊 FASES DE IMPLEMENTAÇÃO

### **FASE 3.1: Setup Electron + SQLite (5-7 dias)**

#### Tarefas:
1. [ ] Instalar Electron + electron-builder
2. [ ] Criar main.ts (Electron entry point)
3. [ ] Setup IPC (Inter-Process Communication)
4. [ ] Criar schema SQLite espelhando Supabase
5. [ ] Implementar CRUD local (equipamentos, OS, etc)
6. [ ] Testar abertura como desktop app

#### Resultado:
- ✅ App abre como .exe (mesmo que web, mas local)
- ✅ Dados salvam em SQLite local
- ✅ Sem Supabase ainda (apenas local)

---

### **FASE 3.2: Sync Engine Bidirecional (10-15 dias)**

#### Tarefas:
1. [ ] Criar queue de operações pendentes
   - `CREATE`, `UPDATE`, `DELETE` locais → staging area
2. [ ] Implementar sync push (LOCAL → SUPABASE)
   - Quando online: enviar fila de alterações
3. [ ] Implementar sync pull (SUPABASE → LOCAL)
   - Quando online: baixar mudanças de outros users
4. [ ] Detectar conectividade (online/offline)
5. [ ] Auto-trigger sync (quando volta online)
6. [ ] Versioning para conflict detection

#### Cenários testados:
- ✅ Modo online: Sync em tempo real
- ✅ Modo offline: Acumula fila, sincroniza depois
- ✅ Volta online: Auto-push pendente
- ✅ Multiple devices: Detecta conflitos

#### Resultado:
- ✅ Dados sincronizam automaticamente
- ✅ Sem perda de dados offline
- ✅ UI mostra status ("📡 Online", "⏳ Sincronizando", "❌ Offline")

---

### **FASE 3.3: Conflict Resolution (7-10 dias)**

#### Cenário Problema:
```
09:00 - User A edita Equipamento "Compressor X" (OFFLINE)
09:05 - User B edita Equipamento "Compressor X" (ONLINE)
09:15 - User A volta online
        → Sistema detecta: 2 versões diferentes!
        → O quê fazer? (Merge? Sobrescrever? Avisar?)
```

#### Estratégias:
1. **Last-Write-Wins** (padrão): Versão mais recente ganha
2. **Field-level merge**: Campos diferentes se unem
3. **Manual resolution**: UI permite ao usuário escolher
4. **Three-way merge**: Usa version anterior como base

#### Tarefas:
1. [ ] Adicionar timestamp + version ID em cada record
2. [ ] Detectar conflito: `.version_local != .version_remote`
3. [ ] Implementar merge automático (campo-a-campo)
4. [ ] UI para conflitos não-resolvíveis (dialog)
5. [ ] Audit log de conflitos resolvidos

#### Resultado:
- ✅ Conflitos automáticos = resolvidos silenciosamente
- ✅ Conflitos críticos = usuário notificado + resolve
- ✅ Sem corrupção de dados

---

### **FASE 3.4: Distribuição & Build (5 dias)**

#### Tarefas:
1. [ ] Configurar electron-builder
2. [ ] Build Windows .exe (com NSIS installer)
3. [ ] Build macOS .dmg (se aplicável)
4. [ ] Code signing (opcional, mas recomendado)
5. [ ] Auto-update capability
6. [ ] Criar installer customizado com branding

#### Resultado:
- ✅ `pcm-estrategico-setup.exe` (instalável)
- ✅ Desktop shortcut para abrir app
- ✅ Auto-update (usuário recebe updates sem reinstalar)

---

### **FASE 3.5: Testing + Hardening (5 dias)**

#### Testes:
1. [ ] Suite completo: offline → online → offline transitions
2. [ ] Multiple devices sincronizando simultaneamente
3. [ ] Data integrity após crashes
4. [ ] Performance com 10k+ registros locais
5. [ ] Security: dados sensíveis criptografados localmente?
6. [ ] Battery life: sync não drena bateria

#### Resultado:
- ✅ Score 9.3/10 (Enterprise Desktop-Ready)
- ✅ Zero data loss
- ✅ Seamless offline/online

---

## 💾 ESTRATÉGIA DE DADOS

### Local SQLite Schema (espelha Supabase):
```sql
-- Cópia local de cada tabela Supabase
CREATE TABLE equipamentos (
  id UUID PRIMARY KEY,
  empresa_id UUID,
  nome VARCHAR(255),
  ...
  _synced BOOLEAN DEFAULT false,
  _version INTEGER,
  _local_changed_at TIMESTAMP,
  _remote_changed_at TIMESTAMP
);

-- Queue de operações pendentes
CREATE TABLE _sync_queue (
  id INTEGER PRIMARY KEY,
  operation TEXT ('CREATE'|'UPDATE'|'DELETE'),
  table_name TEXT,
  record_id UUID,
  payload JSONB,
  created_at TIMESTAMP,
  status TEXT ('PENDING'|'SENT'|'ERROR'),
  error_message TEXT
);

-- Histórico de sincronizações
CREATE TABLE _sync_history (
  id INTEGER PRIMARY KEY,
  synced_at TIMESTAMP,
  operation_count INTEGER,
  status TEXT,
  errors JSONB
);
```

### Fluxo de Sync:
```
User edita Equipamento
↓
LOCAL: Insert/Update SQLite
↓
Check if online?
  ├─ YES → Push para Supabase + Mark synced
  └─ NO → Add to _sync_queue
↓
Check for updates from Supabase
  ├─ YES → Pull + Merge locally
  └─ NO → Continue
↓
UI updates: "✅ Synced" ou "⏳ Offline - 3 pending"
```

---

## 🔐 SEGURANÇA & OFFLINE

### Dados Sensíveis:
- ❓ **Encriptar SQLite local?** (SQLCipher?)
- ❓ **Dados de auth cacheados?** (Supabase session)
- ❓ **Sincronização só para usuário logado?**

### Recomendações:
1. Use **SQLCipher** para encriptar banco local
2. Cache auth session (não gravar senha)
3. Validar permissões ao sync (evitar escalação)
4. Audit log: quem alterou o quê (offline + online)

---

## 📈 IMPACTO NO SCORE

| Fase | Métrica | Current | Target | Score Impact |
|------|---------|---------|--------|--------------|
| 3.1 | Desktop Instalável | 0% | 100% | +0.2 |
| 3.2 | Offline Functionality | 0% | 100% | +0.5 |
| 3.3 | Conflict Resolution | 0% | 95% | +0.3 |
| 3.4 | Distribution | 0% | 100% | +0.2 |
| 3.5 | Hardening | 0% | 90% | +0.1 |
| **Total** | | **7.96** | **9.3** | **+1.34** |

---

## ⏰ TIMELINE REALISTA

### Sprint View:
```
Semana 1 (FASE 3.1): Electron + SQLite setup
Semana 2 (FASE 3.2): Sync engine core
Semana 3 (FASE 3.2): Sync edge cases + conflict resolution
Semana 4 (FASE 3.4): Build + distribution
Semana 5 (FASE 3.5): Testing + hardening

Total: ~5 semanas (25-30 dias de trabalho)
```

### Parallelização com FASE 2:
- **Dias 1-14**: FASE 2 (Zod standardization) — 28 módulos
- **Dias 15-35**: FASE 3 (Desktop offline) — Com FASE 2 validação aplicada

---

## 🎯 ALTERNATIVA: MVP Rápido (10 dias)

Se quiser **versão instalável agora** (sem sync perfeito):

1. **Dias 1-3**: Electron wrapper + SQLite básico
2. **Dias 4-7**: Sync simples (push updates apenas)
3. **Dias 8-10**: Build .exe

**Result:** Desktop app que funciona offline, mas precisa conexão para enviar dados. Não é "offline-first", é "offline-capable".

---

## ✅ DECISÃO NECESSÁRIA

### Você quer:

**Opção A: DESKTOP OFFLINE-FIRST COMPLETO** (5 semanas)
- ✅ Funciona 100% offline
- ✅ Sync automático e silencioso
- ✅ Conflict resolution elegante
- ✅ Score 9.3/10

**Opção B: DESKTOP COM SYNC SIMPLES** (MVP, 10 dias)
- ✅ Instalável + executa offline
- ⚠️ Precisa internet para enviar dados
- ⚠️ Sync manual
- ✅ Score 8.5/10

---

**O que você escolhe?**
- A) Completo (offline-first total)?
- B) MVP rápido (desktop + sync básico)?
- C) Espera terminar FASE 2 antes?

