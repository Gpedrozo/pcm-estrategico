# FASE 2: Zod Standardization — Standard Operating Procedure
**Date:** 2026-04-02  
**Objective:** Apply Zod validation across 28 CRUD modules  
**Current Status:** Foundation created, test template ready  
**Target:** 8.8/10 enterprise validation maturity  

---

## 📋 Overview

### What is FASE 2?
Replace ad-hoc validation patterns with standardized Zod schemas across all CRUD operations, ensuring:
- ✅ Type-safe data transformation (form → API → database)
- ✅ Consistent error handling and user feedback
- ✅ Server-side validation enforcement via RPC
- ✅ Comprehensive test coverage (12+ tests per module)

### Why Now?
- FASE 1 fixed performance bottlenecks (75% dashboard improvement)
- FASE 2 ensures data integrity + compliance + DX
- Foundation exists in `src/schemas/index.ts` + `contratos.service.ts` template
- Remaining 27 modules have wildcard validation gaps

### Timeline
- **Critical 5 modules:** 2-3 days → 8.4/10
- **Extended 23 modules:** 7-10 days → 8.8/10
- **Total FASE 2:** ~2 weeks

---

## 🎯 Module Rollout Sequence

### 🔴 **CRITICAL 5** (Start Immediately)
| Priority | Module | Service | Complexity |
|----------|--------|---------|------------|
| 1 | Equipamentos | ✅ Exists | Schema + Hook + Tests |
| 2 | OrdensServico | ✅ Exists | Schema + Hook + Tests |
| 3 | Materiais | ✅ Exists | Schema + Hook + Tests |
| 4 | Mecânicos | ✅ Exists | Schema + Hook + Tests |
| 5 | Fornecedores | ✅ Exists | Schema + Hook + Tests |

### 🟡 **EXTENDED 23** (Secondary Phase)
- Contratos (keep as template, analyze for reusability)
- Clientes + Contatos + Relacionamentos
- Projetos + Tarefas + SubTarefas
- [17 more modules from full 28-item list]

---

## 📝 Per-Module Checklist

### Phase 2A: Schema Definition (30 min per module)
- [ ]  Open existing service file (`src/services/[name].service.ts`)
- [ ]  Check what Zod schema exists in `src/schemas/`
- [ ]  If schema exists: verify completeness vs. service usage
- [ ]  If schema missing: create in `src/schemas/[name].schema.ts`
- [ ]  Define: CreateSchema, UpdateSchema, ResponseSchema (if needed)
- [ ]  Type inference: `type [Name]Create = z.infer<typeof [Name]CreateSchema>`

**Example: Equipamentos**
```typescript
// src/schemas/equipamentos.schema.ts
export const EquipamentoCreateSchema = z.object({
  empresa_id: z.string().uuid('UUID válido requerido'),
  nome: z.string().min(1, 'Nome obrigatório').max(255),
  tipo: z.enum(['COMPRESSOR', 'SOLDADOR', 'GERADOR', 'BOMBA']),
  localizacao: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'MANUTENÇÃO', 'DESATIVADO']),
});

export type EquipamentoCreate = z.infer<typeof EquipamentoCreateSchema>;
```

### Phase 2B: Service Layer Integration (45 min per module)
- [ ]  Add Zod import to `src/services/[name].service.ts`
- [ ]  Update `criar()` method: validate with `schema.parse()` before insert
- [ ]  Update `atualizar()` method: validate partial data with update schema
- [ ]  Add error handling: catch `z.ZodError` and return meaningful message
- [ ]  Maintain audit trail: log validation failures for compliance

**Key Changes:**
```typescript
// BEFORE
async criar(payload: ContratoFormData) {
  const { data, error } = await supabase.from('contratos').insert([payload])...
}

// AFTER (Zod-compliant)
async criar(payload: ContratoFormData, empresaId: string) {
  const validated = ContratoCreateSchema.parse(payload); // Throws ZodError
  const { data, error } = await supabase.from('contratos')
    .insert([{ ...validated, empresa_id: empresaId }])...
  await writeAuditLog({ action: 'CREATE', table: 'contratos', ... });
}
```

### Phase 2C: React Hook Integration (30 min per module)
- [ ]  Create/update hook: `src/hooks/use[Name].ts`
- [ ]  Add validation wrapper: `safeParse()` before API call
- [ ]  Return error tuple: `{ data, error, isValidating }`
- [ ]  Add proper TypeScript types from schema inference

**Example Hook Pattern:**
```typescript
export function useEquipamento() {
  const mutation = useMutation({
    mutationFn: async (dados: EquipamentoCreate) => {
      // Client-side validation
      const parsed = safeParse(EquipamentoCreateSchema, dados);
      if (!parsed.success) throw new Error(JSON.stringify(parsed.errors));
      
      // Service call
      return equipamentosService.criar(parsed.data!, tenantId);
    },
  });
  return mutation;
}
```

### Phase 2D: Component Validation Display (30 min per module)
- [ ]  Update form component: `src/components/[Name]Form.tsx`
- [ ]  Add validation feedback: inline errors under each field
- [ ]  Add loading state: disable submit while validating
- [ ]  Add success/error toast notifications

**Example UI Pattern:**
```tsx
export function EquipamentoForm({ onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(EquipamentoCreateSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSuccess)}>
      <input {...register('nome')} />
      {errors.nome?.message && <span className="error">{errors.nome.message}</span>}
    </form>
  );
}
```

### Phase 2E: Comprehensive Testing (90 min per module)
- [ ]  Use test template: `src/test/equipamentos-schema.test.ts`
- [ ]  Implement 12+ test cases:
  - 3 valid creation scenarios
  - 4 invalid creation edge cases
  - 3 valid update scenarios
  - 2 invalid update scenarios
  - 2 type inference checks
  - 1 error detail check
  - 1 service integration check
- [ ]  Run: `npm test equipamentos-schema.test.ts`
- [ ]  Achieve: 100% coverage for schema validation

**Test Template to Replicate:**
See `src/test/equipamentos-schema.test.ts` (170 lines)
- Covers all CRUD lifecycle phases
- Demonstrates Zod error handling
- Validates TypeScript type narrowing

### Phase 2F: Documentation & Handoff (15 min per module)
- [ ]  Add JSDoc comments to schema file
- [ ]  Document enum values: why they exist, when to use
- [ ]  Create mini-README: "Quick start for [Module]"
- [ ]  Link to contratos template for reference

---

## 🚀 Execution Workflow

### Daily Rhythm (Target: 2-3 modules/day)

**09:00 - 10:30 (90min):** Phases 2A + 2B (Schema + Service)
```bash
# Terminal commands
cd /workspace/pcm-estrategico
# Edit src/schemas/[name].schema.ts (create if missing)
# Update src/services/[name].service.ts (add validation)
# Commit: git add . && git commit -m "feat: add Zod to [name] module"
```

**10:30 - 11:15 (45min):** Phase 2C (React Hook)
```bash
# Edit/create src/hooks/use[Name].ts
# Test locally: npm run dev → navigate to component
# Commit: git add . && git commit -m "feat: integrate Zod in use[Name] hook"
```

**11:15 - 12:00 (45min):** Phase 2D (Component UI)
```bash
# Edit src/components/[Name]Form.tsx
# Add error display + validation feedback
# Quick visual test
# Commit: git add . && git commit -m "feat: add validation feedback to [Name]Form"
```

**13:00 - 14:30 (90min):** Phase 2E (Tests)
```bash
# Create src/test/[name]-schema.test.ts (copy template)
# Update schema names + sample data
# Run: npm test [name]-schema.test.ts
# Commit: git add . && git commit -m "test: add Zod validation tests for [name]"
```

**14:30 - 15:00 (30min):** Phase 2F (Documentation)
```bash
# Add JSDoc to schema definitions
# Create README in module directory if needed
# Commit: git add . && git commit -m "docs: Zod integration guide for [name]"
```

---

## 📊 Progress Tracking

### Milestone Targets

| Milestone | Modules | Est. Score | Timeline |
|-----------|---------|-----------|----------|
| **FASE 2a Complete** | Critical 5 | 8.4/10 | Day 3 |
| **FASE 2b Complete** | Extended 23 | 8.8/10 | Day 10-12 |
| **FASE 2 Total** | All 28 | 8.8/10 | Day 14 |

### Module Completion Checklist

Copy this for each module:
```
- [ ] Schema definition complete + types inferred
- [ ] Service layer updated + parse() added
- [ ] React hook created + safeParse() integrated
- [ ] Component validation UI added
- [ ] 12+ tests written + all passing
- [ ] Documentation added
- [ ] Commit pushed to GitHub
```

---

## 🔍 Quality Gates

### Pre-Commit Checks
```bash
# 1. Type check
npm run typecheck

# 2. Lint
npm run lint

# 3. Test
npm test [module]-schema.test.ts

# 4. Build
npm run build
```

### Before Pushing
```bash
# 1. Verify no conflicts
git status

# 2. Review changes
git diff --staged

# 3. Run full test suite
npm test

# 4. Commit with conventional message
git commit -m "feat(module): add Zod validation to [module]"
```

---

## 💾 Git Workflow for FASE 2

### Per Module (Atomic Commits)
```bash
# 1. Create feature branch
git checkout -b feat/fase2-[module]-zod

# 2. Work through all 6 phases
[... make changes ...]

# 3. Commit incrementally
git add src/schemas/[module].schema.ts
git commit -m "feat: add Zod schema for [module]"

git add src/services/[module].service.ts
git commit -m "feat: integrate Zod validation in [module] service"

git add src/hooks/use[Module].ts
git commit -m "feat: add safeParse to use[Module] hook"

git add src/components/[Module]Form.tsx
git commit -m "feat: add validation feedback to [Module]Form"

git add src/test/[module]-schema.test.ts
git commit -m "test(zod): comprehensive validation tests for [module]"

# 4. Push and create PR
git push origin feat/fase2-[module]-zod
# Create PR with template
```

### Weekly Summary Commit
```bash
git add docs/FASE2_PROGRESS.md
git commit -m "docs: FASE 2 progress update - 5/28 modules complete"
git push origin main
```

---

## 🛟 Troubleshooting

### Issue: Schema conflict vs. existing validation
**Solution:** Merge existing validation rules into Zod schema. Keep most restrictive rule. Example:
```typescript
// If service already has: nome.length <= 100
// And schema would allow: 255
// → Use min(1).max(100) in schema
```

### Issue: Type inference not working
**Solution:** Use `z.infer<typeof Schema>` pattern exactly:
```typescript
type EquipamentoCreate = z.infer<typeof EquipamentoCreateSchema>;
```

### Issue: Tests failing due to mocked Supabase
**Solution:** Already handled in test template—no live DB calls needed. Schema tests focus purely on Zod validation logic, not service layer.

### Issue: Audit trail not capturing validation errors
**Solution:** Add validation error logging in service:
```typescript
if (!parse.success) {
  await writeAuditLog({
    action: 'VALIDATION_ERROR',
    table: '[module]',
    metadata: { errors: parse.errors },
  });
}
```

---

## 📚 Reference Links

- **Foundation**: `src/schemas/index.ts` (4 Zod schemas + utilities)
- **Test Template**: `src/test/equipamentos-schema.test.ts` (170 lines, ready to copy)
- **Service Template**: `src/services/contratos.service.ts` (already Zod-integrated)
- **Hook Pattern**: `src/hooks/useEquipamentos.ts` (safeParse example)
- **Zod Docs**: https://zod.dev (official reference)

---

## ✅ Sign-Off

**FASE 2 Objective:** → Bring all 28 CRUD modules to production-grade validation

**Current State:**
- ✅ Foundation created
- ✅ Test template ready
- ✅ Service template documented
- ✅ First 5 modules queued

**Next Action:** Begin Critical 5 modules starting with Equipamentos

**Estimated Completion:** 10-14 days to 8.8/10 enterprise standard

---

*Protocol Owner: GitHub Copilot*  
*Last Updated: 2026-04-02T15:45:00Z*  
*Status: FASE 2 SOP ACTIVE*
