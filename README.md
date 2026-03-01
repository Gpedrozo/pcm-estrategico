# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Modelo de permissões SaaS multi-tenant

### Hierarquia

- **Global** (`public.global_roles`)
  - `MASTER_TI`
- **Empresa** (`public.empresa_usuarios`)
  - `OWNER`
  - `ADMIN`
  - `MANAGER`
  - `USER`

### Autoridade de permissão

- A autorização é centralizada no banco via:
  - `public.has_global_role(user_id, role)`
  - `public.has_empresa_role(user_id, empresa_id, role)`
- O frontend consome `public.users_full` e não faz merge manual de papéis.

### Fluxo de criação de empresa

1. Inserir registro em `public.empresas`.
2. Vincular usuário responsável em `public.empresa_usuarios` com role `OWNER`.
3. `MASTER_TI` pode criar e administrar empresas globalmente.

### Fluxo de criação de usuário

1. Usuário é criado no `auth.users`.
2. Trigger de sincronização cria `profiles`/`user_roles` (legado).
3. Usuário é vinculado à empresa em `public.empresa_usuarios`.
4. Visibilidade final ocorre por `RLS + users_full`.

### Fluxo de promoção de role

- Alterações de `global_roles`: apenas `MASTER_TI`.
- Alterações de `empresa_usuarios`:
  - `OWNER` e `MASTER_TI` podem gerenciar.
  - `ADMIN` não pode criar/promover `OWNER` nem `ADMIN`.
- Toda alteração de roles é auditada em `public.audit_logs`.

### Como adicionar novas tabelas mantendo isolamento

1. Criar coluna obrigatória `empresa_id uuid` com FK para `public.empresas(id)`.
2. Ativar `RLS` na tabela.
3. Criar policy padrão:
   - Permitir acesso se `has_global_role(auth.uid(), 'MASTER_TI')`
   - Ou se o usuário pertence à mesma `empresa_id` na `public.empresa_usuarios`.
4. Validar com `public.tenant_integrity_check()`.
