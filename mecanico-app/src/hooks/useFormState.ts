// ============================================================
// useFormState — Hook padronizado para estado de formulários
// Garante: validação uniforme, reset automático, saving state
// ============================================================

import { useState, useCallback, useRef } from 'react';

type ValidationRule<T> = {
  [K in keyof T]?: (value: T[K], data: T) => string | undefined;
};

interface UseFormStateReturn<T> {
  /** Dados atuais do formulário */
  data: T;
  /** Erros de validação por campo */
  errors: Partial<Record<keyof T, string>>;
  /** Se o form está sendo enviado */
  saving: boolean;
  /** Se algum campo foi alterado desde o último reset */
  dirty: boolean;
  /** Atualizar campo individual */
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Atualizar múltiplos campos */
  setFields: (partial: Partial<T>) => void;
  /** Resetar para estado inicial (limpa dados, erros e dirty) */
  reset: () => void;
  /** Setar saving = true */
  startSaving: () => void;
  /** Setar saving = false */
  stopSaving: () => void;
  /** Validar todos os campos segundo as regras. Retorna true se válido. */
  validate: (rules: ValidationRule<T>) => boolean;
  /** Limpar erros */
  clearErrors: () => void;
}

export function useFormState<T extends Record<string, any>>(
  initialData: T,
): UseFormStateReturn<T> {
  const initialRef = useRef(initialData);
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    // Limpa o erro do campo ao editar
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setFields = useCallback((partial: Partial<T>) => {
    setData((prev) => ({ ...prev, ...partial }));
    setDirty(true);
  }, []);

  const reset = useCallback(() => {
    setData(initialRef.current);
    setErrors({});
    setSaving(false);
    setDirty(false);
  }, []);

  const startSaving = useCallback(() => setSaving(true), []);
  const stopSaving = useCallback(() => setSaving(false), []);
  const clearErrors = useCallback(() => setErrors({}), []);

  const validate = useCallback(
    (rules: ValidationRule<T>): boolean => {
      const newErrors: Partial<Record<keyof T, string>> = {};
      let valid = true;

      for (const key of Object.keys(rules) as (keyof T)[]) {
        const rule = rules[key];
        if (rule) {
          const msg = rule(data[key], data);
          if (msg) {
            newErrors[key] = msg;
            valid = false;
          }
        }
      }

      setErrors(newErrors);
      return valid;
    },
    [data],
  );

  return {
    data,
    errors,
    saving,
    dirty,
    setField,
    setFields,
    reset,
    startSaving,
    stopSaving,
    validate,
    clearErrors,
  };
}
