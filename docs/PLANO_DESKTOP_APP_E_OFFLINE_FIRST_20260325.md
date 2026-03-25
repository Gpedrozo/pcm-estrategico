# PCM Estratégico — Plano de Evolução: App Desktop + Modo Offline-First

> **Data:** 25 de março de 2026
> **Status:** Planejamento — executar após estabilização completa do sistema web
> **Prioridade:** Etapa 1 (Desktop) antes da Etapa 2 (Offline-First)

---

## Visão Geral

O PCM Estratégico evoluirá em duas etapas principais:

1. **Etapa 1 — App Desktop Instalável** (sem necessidade de navegador)
2. **Etapa 2 — Modo Offline-First** (opera sem internet, sincroniza ao reconectar)

Ambas as etapas preservam a arquitetura SaaS Multi-Tenant existente, o backend Supabase e toda a lógica de negócio já implementada.

---

## ETAPA 1 — Aplicativo Desktop Instalável

### Objetivo

O sistema será acessível como um programa instalado no computador (Windows, macOS, Linux), sem depender do navegador. O usuário clica no ícone na área de trabalho, o sistema abre como um programa nativo.

### Tecnologia: Electron + Build Existente

O PCM já é um SPA React com Vite. O caminho mais eficiente é empacotá-lo com **Electron**.

```
┌─────────────────────────────────────────────────────┐
│                   ELECTRON SHELL                     │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │          Chromium Embarcado (WebView)          │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │     PCM Estratégico (React SPA)         │  │  │
│  │  │     Mesmo código do build web           │  │  │
│  │  │     Mesmas páginas, rotas, hooks        │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ Auto-update  │  │ System tray  │  │ Deep     │  │
│  │ (Squirrel)   │  │ (icon)       │  │ Links    │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Node.js Backend (para Etapa 2 - IndexedDB)  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Estrutura de Arquivos a Criar

```
electron/
├── main.ts              ← Processo principal Electron
├── preload.ts           ← Bridge segura entre Node e Renderer
├── tray.ts              ← Ícone na bandeja do sistema
├── updater.ts           ← Auto-update via GitHub Releases
├── splash.html          ← Tela de loading ao abrir
└── icons/
    ├── icon.ico         ← Windows
    ├── icon.icns        ← macOS
    └── icon.png         ← Linux
```

### Main Process (`electron/main.ts`)

```typescript
// Conceito do processo principal
import { app, BrowserWindow, Tray, Menu } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'PCM Estratégico',
    icon: path.join(__dirname, 'icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Em produção: carrega o build local
  // Em dev: carrega localhost do Vite
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
```

### Benefícios do Desktop

| Recurso | Web (Browser) | Desktop (Electron) |
|---|---|---|
| Ícone na área de trabalho | ✗ | ✓ |
| Abrir sem browser | ✗ | ✓ |
| System tray (bandeja) | ✗ | ✓ |
| Notificações nativas | Limitado | ✓ Nativo |
| Auto-update | Via deploy | Via Squirrel/electron-updater |
| Atalhos de teclado global | ✗ | ✓ |
| Acesso a arquivos locais | Limitado | ✓ Total |
| Impressão direta | Via dialog | Impressora selecionável |
| Modo offline | Service Worker | IndexedDB + Node.js |

### Build e Distribuição

```json
// electron-builder config (package.json)
{
  "build": {
    "appId": "com.pcmestrategico.desktop",
    "productName": "PCM Estratégico",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": ["nsis"],
      "icon": "electron/icons/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "electron/icons/icon.icns"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "electron/icons/icon.png"
    },
    "publish": {
      "provider": "github",
      "owner": "Gpedrozo",
      "repo": "pcm-estrategico"
    }
  }
}
```

**Resultado:** Um instalador `.exe` (Windows), `.dmg` (macOS) ou `.AppImage` (Linux) que o cliente baixa, instala e usa como qualquer outro programa.

### Auto-Update

```typescript
// electron/updater.ts
import { autoUpdater } from 'electron-updater'

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

// Verifica atualizações a cada 4 horas
setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)
autoUpdater.checkForUpdatesAndNotify()
```

O app verifica automaticamente se há versão nova no GitHub Releases. Se houver, baixa em background e instala ao fechar o programa.

---

## ETAPA 2 — Modo Offline-First

### Objetivo

O sistema opera sem internet. Quando a conexão cair, o usuário continua trabalhando normalmente — criando OS, fechando OS, registrando materiais. Quando a internet voltar, tudo sincroniza automaticamente.

### Cenário Real

```
TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T1 [PCM Online]     → Cria OS #1234 → INSERT vai direto pro Supabase ✓
T2 [Internet cai]   → PCM detecta offline → Banner amarelo "Modo Offline"
T3 [PCM Offline]    → Cria OS #1235 → INSERT vai para SYNC QUEUE local
                       ↳ IndexedDB: { action: "INSERT", table: "ordens_servico",
                          payload: { id: uuid-local, numero: 1235, ... },
                          status: "pending" }
T4 [Mecânico Online] → Abre APK, vê OS #1234, executa e fecha
                       ↳ close_os_with_execution_atomic() executa no servidor ✓
T5 [Internet volta]  → App detecta online
                       ↳ PULL: busca mudanças desde last_sync_at
                          → Recebe: OS #1234 agora está "fechada" com execução
                       ↳ PUSH: envia SYNC QUEUE
                          → OS #1235 é inserida no servidor
                       ↳ IndexedDB atualizado com dados do servidor
                       ↳ UI atualiza: OS #1234 aparece fechada, OS #1235 confirmada
T6 [Banner verde]    → "Sincronizado! 1 OS enviada, 1 OS atualizada"
```

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DO USUÁRIO                         │
│  PCM Desktop  ←→  PWA Web  ←→  APK Mecânico  ←→  Admin     │
└──────┬──────────────┬──────────────┬──────────────┬─────────┘
       │              │              │              │
┌──────▼──────────────▼──────────────▼──────────────▼─────────┐
│                 SERVICE WORKER / ELECTRON IPC                │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Cache API│  │ Background│  │ Periodic  │  │ Push      │  │
│  │ (assets) │  │ Sync API  │  │ Sync API  │  │ Notif.    │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────┘  │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│                 STORAGE LOCAL (no dispositivo)               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  IndexedDB (via Dexie.js)             │   │
│  │                                                      │   │
│  │  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  │   │
│  │  │ ordens_      │  │ materiais_ │  │ equipamentos│  │   │
│  │  │ servico      │  │ utilizados │  │             │  │   │
│  │  └──────────────┘  └────────────┘  └─────────────┘  │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │      SYNC QUEUE (fila de operações)           │    │   │
│  │  │  { id, action, table, payload, timestamp,     │    │   │
│  │  │    tenant_id, user_id, status, retries }      │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │     VERSION MAP (controle de conflitos)       │    │   │
│  │  │  { table, row_id, local_ver, server_ver }     │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ ← ONLINE? →
       │
┌──────▼──────────────────────────────────────────────────────┐
│                    SYNC ENGINE                               │
│                                                             │
│  1. Detecta online/offline (navigator.onLine + heartbeat)   │
│  2. OFFLINE: writes → SYNC QUEUE (IndexedDB)                │
│  3. ONLINE:                                                 │
│     a. PULL primeiro (busca mudanças do servidor)            │
│     b. Resolve conflitos (regras por entidade)               │
│     c. PUSH fila local (envia operações pendentes)           │
│     d. Confirma e limpa fila                                │
│                                                             │
│  Regras de conflito por entidade:                           │
│  ┌────────────────────┬────────────────────────────────┐    │
│  │ Entidade           │ Regra                          │    │
│  ├────────────────────┼────────────────────────────────┤    │
│  │ OS (criar)         │ UUID client-side → sem conflito│    │
│  │ OS (fechar)        │ Server wins (função atômica)   │    │
│  │ OS (editar campos) │ Field-level merge + UI warning │    │
│  │ Materiais          │ Append-only → sem conflito     │    │
│  │ Chamados suporte   │ Append messages, merge array   │    │
│  │ Equipamentos       │ Last-Write-Wins + timestamp    │    │
│  └────────────────────┴────────────────────────────────┘    │
│                                                             │
│  Campos obrigatórios em TODA tabela sincronizável:          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ updated_at  TIMESTAMPTZ  — servidor define na escrita│   │
│  │ updated_by  UUID         — quem alterou por último   │   │
│  │ sync_version INTEGER     — incrementado a cada push  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Detecção de conflito (resolução automática por padrão):    │
│  → Se local.sync_version != server.sync_version ao PUSH:   │
│    → Campos DIFERENTES editados → merge automático (silent) │
│    → MESMO campo editado por 2 users:                       │
│      → Default: Last-Write-Wins (resolve sozinho)           │
│      → Só mostra UI se campo CRÍTICO (status, responsável): │
│        "Atenção: João alterou o status desta OS.             │
│         O sistema manteve a versão mais recente."           │
│      → Usuário operacional NUNCA precisa decidir            │
│    → Tudo registrado no conflict_log (auditoria silenciosa) │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│              SUPABASE BACKEND (Multi-Tenant)                 │
│                                                             │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │ Realtime     │  │ sync_operations │  │ conflict_log  │  │
│  │ (WebSocket)  │  │ (fila server)   │  │ (auditoria)   │  │
│  └──────────────┘  └─────────────────┘  └───────────────┘  │
│                                                             │
│  Nova tabela: sync_metadata                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ id | empresa_id | table_name | row_id | version |    │   │
│  │    | updated_at | updated_by | checksum | deleted    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Edge Function: /sync                                       │
│  POST { tenant_id, last_sync_at, operations[] }             │
│  → Retorna: { applied[], conflicts[], server_changes[] }    │
│                                                             │
│  Otimizações de Sync (para escala):                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Sync incremental por tabela (não tudo de uma vez)│   │
│  │    POST /sync/ordens_servico                         │   │
│  │    POST /sync/equipamentos                           │   │
│  │                                                      │   │
│  │ 2. Delta sync por ID (só registros alterados)        │   │
│  │    WHERE updated_at > last_sync_at                   │   │
│  │    LIMIT 100 (paginado)                              │   │
│  │                                                      │   │
│  │ 3. Supabase Realtime para push imediato              │   │
│  │    → Quando outro user altera OS, chega via WS       │   │
│  │    → Elimina polling para dados quentes              │   │
│  │                                                      │   │
│  │ 4. Compressão de payload (gzip no body)              │   │
│  │    → Reduz bandwidth em redes lentas (chão fábrica)  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Stack Tecnológica

| Componente | Tecnologia | Motivo |
|---|---|---|
| Desktop Shell | **Electron 33+** | Chromium embarcado, Node.js, auto-update |
| Local DB | **Dexie.js** (IndexedDB) | API Promise, tipagem TS, live queries, ~15KB |
| Sync Engine | **Custom** | Controle total sobre regras multi-tenant |
| Conflict Resolution | **Field-level LWW** | Simples, previsível, auditável |
| Online Detection | **navigator.onLine + heartbeat** | onLine sozinho não é confiável |
| Background Sync | **Background Sync API** | Reenvia quando volta online |
| Realtime Push | **Supabase Realtime** (já usado) | Push do servidor para client |
| Build/Package | **electron-builder** | NSIS (Win), DMG (Mac), AppImage (Linux) |
| Auto-update | **electron-updater** | Via GitHub Releases, seguro e automático |

### IndexedDB Schema (Dexie.js)

```typescript
// src/offline/db.ts
import Dexie, { Table } from 'dexie'

interface SyncQueueEntry {
  id: string           // UUID
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC'
  table: string        // ex: 'ordens_servico'
  payload: Record<string, unknown>
  tenant_id: string
  user_id: string
  created_at: string   // ISO timestamp
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'
  retries: number
  error?: string
}

interface VersionEntry {
  id: string           // `${table}_${row_id}`
  table: string
  row_id: string
  local_version: number
  server_version: number
  last_synced_at: string
}

class PCMOfflineDB extends Dexie {
  syncQueue!: Table<SyncQueueEntry>
  versions!: Table<VersionEntry>
  ordensServico!: Table<Record<string, unknown>>
  equipamentos!: Table<Record<string, unknown>>
  materiaisUtilizados!: Table<Record<string, unknown>>
  profiles!: Table<Record<string, unknown>>

  constructor(tenantId: string) {
    super(`pcm_${tenantId}`)  // DB isolado por tenant
    this.version(1).stores({
      syncQueue: 'id, status, table, created_at',
      versions: 'id, table, row_id',
      ordensServico: 'id, numero, status, empresa_id',
      equipamentos: 'id, tag, nome, empresa_id',
      materiaisUtilizados: 'id, os_id, empresa_id',
      profiles: 'id, empresa_id',
    })
  }
}
```

### Sync Engine

```typescript
// src/offline/syncEngine.ts (conceito)

class SyncEngine {
  private db: PCMOfflineDB
  private isOnline = navigator.onLine
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null

  constructor(tenantId: string) {
    this.db = new PCMOfflineDB(tenantId)
    this.setupListeners()
  }

  private setupListeners() {
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())
    // Heartbeat: verifica conectividade real a cada 30s
    this.heartbeatInterval = setInterval(() => this.checkRealConnectivity(), 30_000)
  }

  private async checkRealConnectivity() {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      })
      this.isOnline = response.ok
    } catch {
      this.isOnline = false
    }
  }

  private async handleOnline() {
    this.isOnline = true
    // 1. PULL primeiro (buscar mudanças do servidor)
    await this.pullServerChanges()
    // 2. PUSH (enviar fila local)
    await this.pushPendingOperations()
  }

  private handleOffline() {
    this.isOnline = false
    // UI mostra banner "Modo Offline"
  }

  // Intercepta operações de escrita
  async write(table: string, action: string, payload: Record<string, unknown>) {
    if (this.isOnline) {
      // Online: envia direto para Supabase
      return this.sendToServer(table, action, payload)
    }

    // Offline: enfileira localmente
    await this.db.syncQueue.add({
      id: crypto.randomUUID(),
      action: action as SyncQueueEntry['action'],
      table,
      payload,
      tenant_id: this.db.name.replace('pcm_', ''),
      user_id: getCurrentUserId(),
      created_at: new Date().toISOString(),
      status: 'pending',
      retries: 0,
    })

    // Salva também no IndexedDB local para leitura imediata
    await this.db.table(table).put(payload)
  }

  private async pullServerChanges() {
    const lastSync = localStorage.getItem('last_sync_at') ?? '1970-01-01T00:00:00Z'
    const response = await fetch('/functions/v1/sync', {
      method: 'POST',
      body: JSON.stringify({ last_sync_at: lastSync }),
    })
    const { server_changes } = await response.json()

    // Aplica mudanças do servidor no IndexedDB local
    for (const change of server_changes) {
      await this.db.table(change.table).put(change.data)
    }

    localStorage.setItem('last_sync_at', new Date().toISOString())
  }

  private async pushPendingOperations() {
    const pending = await this.db.syncQueue
      .where('status').equals('pending')
      .sortBy('created_at')

    for (const op of pending) {
      try {
        await this.db.syncQueue.update(op.id, { status: 'syncing' })
        await this.sendToServer(op.table, op.action, op.payload)
        await this.db.syncQueue.update(op.id, { status: 'synced' })
      } catch (err: any) {
        const retries = op.retries + 1
        await this.db.syncQueue.update(op.id, {
          status: retries >= 3 ? 'failed' : 'pending',
          retries,
          error: err.message,
        })
      }
    }
  }
}
```

### UI — Indicadores de Estado (Sync Invisível)

**Princípio:** O sistema resolve tudo sozinho. O usuário operacional (mecânico, gestor)
não precisa entender tecnicamente o que é "sync". Ele só precisa saber:
estou conectado ou não.

```
INDICADOR MÍNIMO (canto superior direito da sidebar):

  🟢  → Online (sem texto, só o ponto verde)
  🟡  → Offline (texto discreto: "Sem internet")

Nenhum banner, nenhum popup, nenhum contador técnico.
O sync acontece 100% em background, silencioso.

Quando o sync completa após voltar online:
  → Toast discreto (2s): "Dados atualizados" (e some)
  → Sem "2/5 operações", sem "sync queue"

Quando há conflito crítico resolvido automaticamente:
  → Toast informativo (3s): "OS #1234 foi atualizada por João"
  → Só informa, não pede ação

Registros criados offline (badge sutil):
┌─────────────────────────────────────────────┐
│ OS #1235                              ☁ ↑   │ → Seta discreta = será enviado
│ Corretiva — Bomba pressurização            │
│ Criado em 25/03/2026 10:32                 │
└─────────────────────────────────────────────┘

Após sincronizar (badge some automaticamente):
┌─────────────────────────────────────────────┐
│ OS #1235                                    │ → Nenhum badge = normal
│ Corretiva — Bomba pressurização            │
│ Criado em 25/03/2026 10:32                 │
└─────────────────────────────────────────────┘

Painel técnico "Fila de Sincronização" → SOMENTE para Admin/Owner
  → Acessível em Configurações > Sync
  → Mostra detalhes técnicos, conflict_log, retry count
  → Usuário operacional NUNCA vê isso
```

### Segurança Multi-Tenant Offline

```
REGRA DE OURO: Dados offline SEMPRE escopados por tenant_id

IndexedDB Store = pcm_{tenant_id}_ordens_servico
                  pcm_{tenant_id}_equipamentos
                  pcm_{tenant_id}_materiais

→ Tenant A NUNCA acessa dados locais do Tenant B
→ Logout limpa IndexedDB do tenant atual
→ Token expirado offline:
  Operações ficam na fila, re-autentica ao voltar online
  antes de sincronizar
→ Dados sensíveis (senhas, tokens) NUNCA ficam no IndexedDB
→ Dados criptografados com chave derivada do token do usuário
```

### Limpeza ao Trocar de Tenant (CRÍTICO)

Quando um usuário troca de empresa ou loga com outro tenant:

```typescript
// src/offline/tenantGuard.ts
async function onTenantSwitch(oldTenantId: string, newTenantId: string) {
  if (oldTenantId === newTenantId) return

  const oldDb = new PCMOfflineDB(oldTenantId)

  // 1. Verifica se há operações pendentes do tenant anterior
  const pending = await oldDb.syncQueue
    .where('status').equals('pending')
    .count()

  if (pending > 0) {
    // Força sync antes de limpar (se online)
    if (navigator.onLine) {
      await syncEngine.pushPendingOperations()
    } else {
      // Avisa: "Você tem X operações não sincronizadas do tenant anterior"
      // Oferece: "Trocar mesmo assim?" (operações ficam para sync futuro)
      const confirmed = await showConfirmDialog(
        `Existem ${pending} operações offline não sincronizadas. Trocar de empresa mesmo assim?`
      )
      if (!confirmed) return
    }
  }

  // 2. Limpa cache de leitura do tenant anterior (dados stale)
  await oldDb.ordensServico.clear()
  await oldDb.equipamentos.clear()
  await oldDb.materiaisUtilizados.clear()
  await oldDb.profiles.clear()
  // NÃO limpa syncQueue — operações pendentes sobrevivem para sync futuro

  // 3. Inicializa DB do novo tenant
  const newDb = new PCMOfflineDB(newTenantId)
  await newDb.open()
}
```

**Regra:** Dados de leitura (cache) são limpos ao trocar. Operações de escrita pendentes são preservadas até sincronizar.

### Criptografia Offline — Equilíbrio Segurança vs Usabilidade

Problema: se a chave de criptografia depende 100% do token JWT, quando o token expira offline, os dados ficam ilegíveis.

```
SOLUÇÃO: Chave híbrida (derivada + local)

┌─────────────────────────────────────────────────────┐
│  Chave de criptografia = PBKDF2(                    │
│    password: user_id + tenant_id,                    │
│    salt: app_secret_fixo (hardcoded no build),       │
│    iterations: 100_000                               │
│  )                                                  │
│                                                     │
│  → Não depende do token JWT                          │
│  → Derivável mesmo offline                          │
│  → user_id + tenant_id = escopada por usuário/tenant│
│  → Nível: criptografia leve (proteção contra acesso │
│    casual, não contra ataque forense)                │
└─────────────────────────────────────────────────────┘

Dados que SÃO criptografados:
  → payloads da syncQueue (contêm dados de negócio)
  → cache de OS e materiais

Dados que NÃO são criptografados:
  → metadata de sync (timestamps, status)
  → schema/indices do IndexedDB

Ao fazer logout:
  → Limpa TUDO do IndexedDB (wipe completo)
  → Chave é descartada da memória
```

### Tabelas Sincronizáveis (escopo inicial)

| Tabela | Leitura Offline | Escrita Offline | Prioridade |
|---|---|---|---|
| `ordens_servico` | ✓ | ✓ (criar, editar) | Crítica |
| `execucao_os` | ✓ | ✓ (registrar) | Crítica |
| `materiais_os` | ✓ | ✓ (registrar uso) | Alta |
| `equipamentos` | ✓ | ✗ (somente leitura) | Alta |
| `profiles` | ✓ | ✗ (somente leitura) | Média |
| `setores` | ✓ | ✗ (somente leitura) | Média |
| `support_tickets` | ✓ | ✓ (criar, responder) | Baixa |
| `preventiva_*` | ✓ | ✓ (registrar execução) | Média |

### Tabelas NÃO sincronizáveis (ficam apenas online)

| Tabela | Motivo |
|---|---|
| `enterprise_audit_logs` | Somente escrita server-side |
| `auth.users` | Segurança — nunca expor offline |
| `configuracoes_sistema` | Admin-only, risco de desync |
| `planos`, `subscriptions` | Comercial — somente owner |
| `contratos` | Jurídico — somente owner |

---

## Fases de Execução

### Fase 0 — Pré-requisitos (antes de tudo)
- [ ] Estabilizar 100% do sistema web (todos os módulos funcionando)
- [ ] Zerar erros no painel de problemas
- [ ] Todos os testes passando (263+ testes)
- [ ] Build de produção limpo
- [ ] Deploy da Edge Function atualizada

### Fase 1 — App Desktop (Electron)
- [ ] Criar estrutura `electron/` (main.ts, preload.ts, tray.ts)
- [ ] Configurar `electron-builder` no package.json
- [ ] Gerar build Windows (.exe NSIS installer)
- [ ] Testar instalação/desinstalação limpa
- [ ] System tray com ícone PCM
- [ ] Auto-update via GitHub Releases
- [ ] Otimizar consumo de memória (lazy loading, limitar processos)
- [ ] Configurar Electron Fuses (segurança)
- [ ] Testes em macOS (.dmg) e Linux (.AppImage)
- [ ] Publicar primeiro release v1.0.0

### Fase 2 — Leitura Offline (Cache)
- [ ] Instalar Dexie.js como dependência
- [ ] Criar schema IndexedDB por tenant
- [ ] Interceptar queries de leitura (OS, equipamentos, materiais)
- [ ] Cachear respostas no IndexedDB
- [ ] Servir do cache quando offline
- [ ] Banner de status online/offline
- [ ] Heartbeat de conectividade (30s)

### Fase 3 — Escrita Offline (Sync Queue)
- [ ] Implementar SyncQueue no IndexedDB
- [ ] Interceptar mutations (criar OS, registrar materiais)
- [ ] Gerar UUIDs client-side para novas entidades
- [ ] Badge "⏳ Aguardando sync" em registros offline
- [ ] Background Sync API para auto-reenvio
- [ ] Retry exponencial com limite (3x)

### Fase 4 — Sync Bidirecional
- [ ] Edge Function `/sync` (pull + push)
- [ ] Tabela `sync_metadata` no Supabase
- [ ] Adicionar `updated_at`, `updated_by`, `sync_version` nas tabelas sincronizáveis
- [ ] Pull-first strategy (busca servidor antes de enviar)
- [ ] Sync incremental por tabela + delta por ID
- [ ] Conflict resolution por entidade com UI de resolução
- [ ] `conflict_log` para auditoria
- [ ] Badge "✓ Sincronizado" após sync
- [ ] Limpeza automática de fila synced
- [ ] Limpeza de cache ao trocar de tenant

### Fase 5 — UX Completa
- [ ] Banner persistente de status colorido
- [ ] Contador de operações pendentes
- [ ] Painel "Fila de Sincronização" (admin)
- [ ] Notificações nativas (Electron + Push)
- [ ] Indicador por registro (synced/pending/conflict)
- [ ] Logs de sync exportáveis

---

## Estimativa de Dependências Novas

```json
{
  "dependencies": {
    "dexie": "^4.x"           // IndexedDB wrapper (~15KB)
  },
  "devDependencies": {
    "electron": "^33.x",       // Shell desktop
    "electron-builder": "^25.x", // Empacotamento
    "electron-updater": "^6.x"  // Auto-update
  }
}
```

---

## Otimização Electron (Memória e Performance)

Electron embarca Chromium completo — consome RAM significativa. Mitigações:

```
┌──────────────────────────────────────────────────────────────┐
│ OTIMIZAÇÕES DE MEMÓRIA (ELECTRON)                            │
│                                                              │
│ 1. Code Splitting agressivo (Vite já faz, reforçar)         │
│    → Lazy load de rotas: React.lazy() + Suspense            │
│    → Só carrega módulo quando usuário acessa                 │
│                                                              │
│ 2. Limitar logs em produção                                  │
│    → console.log → noop em production build                  │
│    → Electron logs → arquivo rotativo (max 5MB)              │
│                                                              │
│ 3. BrowserWindow com otimizações                             │
│    → backgroundThrottling: true (throttle abas em background)│
│    → v8CacheOptions: 'bypassHeatCheck' (startup mais rápido) │
│                                                              │
│ 4. Electron Fuses (segurança + performance)                  │
│    → Desabilitar Node.js no renderer                         │
│    → Desabilitar remote module                               │
│    → Habilitar context isolation                             │
│                                                              │
│ 5. Single Instance Lock                                      │
│    → app.requestSingleInstanceLock()                         │
│    → Impede múltiplas instâncias consumindo RAM duplicada    │
│                                                              │
│ 6. Garbage Collection periódico                              │
│    → mainWindow.webContents.session.clearCache() a cada 1h   │
│    → Limita crescimento de memória em uso prolongado         │
│                                                              │
│ META: Manter consumo abaixo de 200MB idle, 400MB em uso ativo│
└──────────────────────────────────────────────────────────────┘
```

---

## Evolução Futura (Pós Offline-First)

Após as Etapas 1 e 2 estarem estáveis, o PCM pode evoluir para:

### Fase 6 — App Mobile (React Native)

```
┌────────────────────────────────────────────────────────┐
│                 APP MOBILE PCM                         │
│                                                       │
│   Tecnologia: React Native (Expo)                     │
│   Compartilha: hooks, services, types do projeto web   │
│   Específico: UI nativa, câmera, GPS, NFC             │
│                                                       │
│   Casos de uso no chão de fábrica:                    │
│   ✔ Mecânico escaneia QR do equipamento               │
│   ✔ Abre OS vinculada no celular                      │
│   ✔ Registra execução com foto                        │
│   ✔ Funciona offline (mesma sync engine)              │
│   ✔ GPS registra localização da manutenção            │
└────────────────────────────────────────────────────────┘
```

### Fase 7 — IA para Manutenção Preditiva

```
┌────────────────────────────────────────────────────────┐
│              INTELIGÊNCIA ARTIFICIAL                    │
│                                                       │
│   Modelo: Análise de padrões de falha                  │
│   Input: Histórico de OS por equipamento               │
│                                                       │
│   Previsões:                                          │
│   ✔ "Bomba XYZ tem 78% de chance de falhar em 15 dias"│
│   ✔ "Compressor ABC está com ciclo de falha acelerado"│
│   ✔ Sugestão automática de preventiva                 │
│                                                       │
│   Stack: Python (scikit-learn) ou Supabase AI          │
│   Trigger: Edge Function processa dados a cada 24h    │
│   Output: Alertas no dashboard do gestor              │
└────────────────────────────────────────────────────────┘
```

### Fase 8 — Integração IoT (Sensores)

```
┌────────────────────────────────────────────────────────┐
│              INTEGRAÇÃO IoT                            │
│                                                       │
│   Sensores em equipamentos críticos:                  │
│   ✔ Temperatura                                      │
│   ✔ Vibração                                         │
│   ✔ Pressão                                          │
│   ✔ Horas de operação                                │
│                                                       │
│   Protocolo: MQTT → Supabase (via Edge Function)      │
│   Ação: Threshold excedido → OS automática gerada     │
│                                                       │
│   Exemplo real:                                       │
│   Sensor detecta vibração anormal na Bomba #12        │
│   → Edge Function recebe alerta MQTT                  │
│   → Cria OS corretiva automática                      │
│   → Notifica mecânico mais próximo                    │
│   → Registra no histórico do equipamento              │
└────────────────────────────────────────────────────────┘
```

### Fase 9 — BI Avançado (Business Intelligence)

```
┌────────────────────────────────────────────────────────┐
│              BUSINESS INTELLIGENCE                     │
│                                                       │
│   Dashboards avançados com:                           │
│   ✔ MTBF (Mean Time Between Failures) por equipamento │
│   ✔ MTTR (Mean Time To Repair) por equipe             │
│   ✔ Custo de manutenção por setor/período             │
│   ✔ Backlog aging (OS abertas há mais de X dias)      │
│   ✔ Tendência de falhas (gráfico temporal)            │
│   ✔ Comparativo entre plantas/filiais                 │
│                                                       │
│   Stack: Recharts (já no projeto) + queries otimizadas│
│   Exportação: PDF, Excel, CSV                         │
│   Acesso: Owner + Admin (role-based)                  │
└────────────────────────────────────────────────────────┘
```

### Roadmap Visual Completo

```
2026 Q2          Q3          Q4          2027 Q1        Q2
  │              │            │             │            │
  ├──[FASE 1]──►│            │             │            │
  │  Desktop     │            │             │            │
  │              ├──[FASE 2]►│             │            │
  │              │  Cache     │             │            │
  │              │  Offline   │             │            │
  │              │            ├──[FASE 3]─►│            │
  │              │            │  Sync Queue │            │
  │              │            │             ├──[FASE 4]►│
  │              │            │             │  Bidirecio │
  │              │            │             │  nal Sync  │
  │              │            │             │            ├──[FASE 5+]
  │              │            │             │            │  UX + Mobile
  │              │            │             │            │  + IA + IoT
  └──────────────┴────────────┴─────────────┴────────────┘
```

---

## Resumo Executivo

| Item | Descrição |
|---|---|
| **O que muda para o usuário** | Instala como programa, funciona sem internet |
| **O que NÃO muda** | Backend, Supabase, lógica de negócio, RLS, multi-tenant |
| **Risco** | Baixo (Electron empacota o mesmo build web) |
| **Vantagem competitiva** | Nenhum PCM SaaS concorrente no Brasil oferece offline-first com sync multi-tenant |
| **Evolução futura** | Mobile (React Native), IA preditiva, IoT (sensores), BI avançado |
| **Quando executar** | Após estabilização completa de todos os módulos |

---

> **Este documento é um plano de referência.** Nenhuma implementação será feita agora.
> Quando o sistema estiver 100% estável, este plano será executado fase por fase.
