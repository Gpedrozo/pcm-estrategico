# FASE 2: Zod Standardization — Standard Operating Procedure
**Date:** 2026-04-02  
**Status:** ACTIVE  
**Objective:** Apply Zod validation across 28 CRUD modules  
**Target:** 8.8/10 enterprise validation maturity  

---

## 📋 Overview

FASE 2 standardizes validation across all CRUD modules using Zod schemas, ensuring:
- ✅ Type-safe data transformation (form → API → database)
- ✅ Consistent error handling and user feedback
- ✅ Server-side validation enforcement via RPC
- ✅ Comprehensive test coverage (12+ tests per module)

---

## 🎯 Module Rollout Sequence

### 🔴 **CRITICAL 5** (Start Immediately)
1. Equipamentos
2. OrdensServico
3. Materiais
4. Mecânicos
5. Fornecedores

### 🟡 **EXTENDED 23** (Secondary Phase)
- Contratos (template reference)
- [22 other modules from full 28-item list]

---

## 📝 Per-Module Checklist

### Phase 2A: Schema Definition (30 min)
- [ ] Open `src/schemas/[name].schema.ts`
- [ ] Verify/add: CreateSchema, UpdateSchema
- [ ] Add type inference: `type [Name]Create = z.infer<typeof Schema>`

**Example:**
```typescript
export const EquipamentoCreateSchema = z.object({
  nome: z.string().min(1, 'obrigatório').max(255),
  tipo: z.enum(['COMPRESSOR', 'SOLDADOR', ...]),
  status: z.enum(['ATIVO', 'INATIVO', ...]),
  localizacao: z.string().optional(),
});
```

### Phase 2B: Service Layer Integration (45 min)
- [ ] Update `src/services/[name].service.ts`
- [ ] Replace direct payload usage with `schema.parse()`
- [ ] Add error handling for ZodError
- [ ] Maintain audit trail for validation failures

**Example:**
```typescript
async criar(payload: ContratoFormData) {
  const validated = ContratoCreateSchema.parse(payload);
  const { data, error } = await supabase
    .from('contratos')
    .insert([validated])...
}
```

### Phase 2C: React Hook Integration (30 min)
- [ ] Create/update `src/hooks/use[Name].ts`
- [ ] Add `safeParse()` wrapper before API call
- [ ] Return error tuple: `{ data, error, isValidating }`
- [ ] Add proper TypeScript types from schema

### Phase 2D: Component Validation Display (30 min)
- [ ] Update form component: `src/components/[Name]Form.tsx`
- [ ] Add validation feedback: inline errors below fields
- [ ] Add loading state: disable submit while validating
- [ ] Add success/error notifications

### Phase 2E: Comprehensive Testing (90 min)
- [ ] Copy test template: `src/test/equipamentos-schema.test.ts`
- [ ] Implement 12+ test cases
- [ ] Run: `npm test [name]-schema.test.ts`
- [ ] Achieve: 100% validation coverage

### Phase 2F: Documentation (15 min)
- [ ] Add JSDoc comments to schema files
- [ ] Document enum values and constraints
- [ ] Create README: "Quick start for [Module]"

---

## 🚀 Daily Execution

**Recommended Pace:** 2-3 modules/day

**09:00-10:30:** Phases 2A + 2B
```bash
cd /workspace/pcm  
git checkout feat/fase2-[module]
# Edit src/schemas/[name].schema.ts
# Update src/services/[name].service.ts
git add . && git commit -m "feat: add Zod to [name]"
```

**10:30-11:15:** Phase 2C
```bash
# Edit src/hooks/use[Name].ts
git add . && git commit -m "feat: integrate Zod in use[Name]"
```

**11:15-12:00:** Phase 2D
```bash
# Edit src/components/[Name]Form.tsx
git add . && git commit -m "feat: validation feedback"
```

**13:00-14:30:** Phase 2E
```bash
npm test [name]-schema.test.ts
git add . && git commit -m "test: Zod validation tests"
```

**14:30-15:00:** Phase 2F
```bash
git add . && git commit -m "docs: Zod integration guide"
```

---

## 📊 Progress Milestones

| Milestone | Modules | Score | Timeline |
|-----------|---------|-------|----------|
| Critical 5 | 5 | 8.4/10 | Day 3 |
| Extended 23 | 23 | 8.8/10 | Day 12 |
| **FASE 2 Complete** | 28 | 8.8/10 | **Day 14** |

---

## 🛟 Troubleshooting

**Conflict with existing validation:**  
→ Merge rules into Zod schema. Keep most restrictive.

**Type inference failing:**  
→ Use: `type X = z.infer<typeof XSchema>`

**Service validation location:**  
→ Parse before Supabase insert. Capture errors in audit.

**Test mocking issues:**  
→ Tests focus on Zod validation only, not services.

---

## 📚 Resources

- **Foundation**: `src/schemas/index.ts`
- **Test Template**: `src/test/equipamentos-schema.test.ts`
- **Service Template**: `src/services/contratos.service.ts`
- **Zod Docs**: https://zod.dev

---

**Protocol Owner:** GitHub Copilot  
**Next Action:** Begin Critical 5 with Equipamentos
