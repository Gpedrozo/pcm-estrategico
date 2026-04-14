// ============================================================
// Feedback — Sistema padronizado de mensagens para o usuário
// Classifica erros (rede, permissão, validação, genérico)
// Centraliza sucesso, erro, confirmação
// ============================================================

import { Alert } from 'react-native';

// ---- Classificação de erros ----

function parseError(error: unknown): string {
  if (!error) return 'Ocorreu um erro inesperado. Tente novamente.';

  const msg =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? String((error as Record<string, unknown>).message ?? (error as Record<string, unknown>).error_description ?? '')
          : '';

  const lower = msg.toLowerCase();

  // Rede / timeout
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused') ||
    lower.includes('unable to resolve') ||
    lower.includes('internet')
  ) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }

  // Permissão / RLS
  if (
    lower.includes('permission') ||
    lower.includes('rls') ||
    lower.includes('policy') ||
    lower.includes('not allowed') ||
    lower.includes('unauthorized') ||
    lower.includes('403')
  ) {
    return 'Você não tem permissão para esta operação.';
  }

  // Conflito / duplicidade
  if (
    lower.includes('duplicate') ||
    lower.includes('unique') ||
    lower.includes('conflict') ||
    lower.includes('already exists')
  ) {
    return 'Este registro já existe. Verifique os dados e tente novamente.';
  }

  // Validação server
  if (
    lower.includes('invalid') ||
    lower.includes('validation') ||
    lower.includes('required') ||
    lower.includes('must be')
  ) {
    return `Dados inválidos: ${msg}`;
  }

  // Genérico com mensagem original se razoável
  if (msg.length > 0 && msg.length < 200) {
    return msg;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}

// ---- API pública ----

/**
 * Exibe mensagem de sucesso padronizada.
 * @param message Texto de sucesso
 * @param onDismiss Callback ao fechar (ex: nav.goBack)
 */
export function showSuccess(message: string, onDismiss?: () => void) {
  Alert.alert('Sucesso', message, [
    { text: 'OK', onPress: onDismiss },
  ]);
}

/**
 * Exibe mensagem de erro classificada.
 * @param error Erro capturado (Error, string, objeto Supabase)
 */
export function showError(error: unknown) {
  Alert.alert('Erro', parseError(error));
}

/**
 * Exibe mensagem de atenção / validação.
 * @param message Texto de aviso
 */
export function showWarning(message: string) {
  Alert.alert('Atenção', message);
}

/**
 * Exibe diálogo de confirmação antes de ação destrutiva/importante.
 * @param title Título
 * @param message Descrição
 * @param onConfirm Callback ao confirmar
 * @param confirmText Texto do botão (default: "Confirmar")
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Confirmar',
) {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}
