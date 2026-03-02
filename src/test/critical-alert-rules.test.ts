import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface CriticalAlertRulesFile {
  table: string;
  defaultSeverity: 'critical';
  rules: Array<{
    id: string;
    source: string;
    enabled: boolean;
    match: {
      actionTypeIn: string[];
      severityIn: string[];
    };
  }>;
}

describe('critical alert rules', () => {
  const filePath = path.resolve(process.cwd(), 'docs/CRITICAL_ALERT_RULES.json');

  it('keeps rules versioned for enterprise_audit_logs critical events', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rules = JSON.parse(content) as CriticalAlertRulesFile;

    expect(rules.table).toBe('enterprise_audit_logs');
    expect(rules.defaultSeverity).toBe('critical');
    expect(rules.rules.length).toBeGreaterThan(0);
    expect(rules.rules.every((rule) => rule.enabled)).toBe(true);
    expect(rules.rules.every((rule) => rule.match.severityIn.includes('critical'))).toBe(true);
  });

  it('covers critical events from edge, client, auth and control-plane sources', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rules = JSON.parse(content) as CriticalAlertRulesFile;

    const sources = new Set(rules.rules.map((rule) => rule.source));

    expect(sources.has('main_global_handlers')).toBe(true);
    expect(sources.has('auth_context')).toBe(true);
    expect(sources.has('master_users_manager')).toBe(true);
    expect(sources.has('stripe_webhook')).toBe(true);
    expect(sources.has('system_health_check')).toBe(true);

    const actionTypes = new Set(
      rules.rules.flatMap((rule) => rule.match.actionTypeIn),
    );

    expect(actionTypes.has('CLIENT_UNHANDLED_ERROR')).toBe(true);
    expect(actionTypes.has('CLIENT_UNHANDLED_REJECTION')).toBe(true);
    expect(actionTypes.has('STRIPE_WEBHOOK_FAILED')).toBe(true);
    expect(actionTypes.has('STRIPE_WEBHOOK_NOT_CONFIGURED')).toBe(true);
    expect(actionTypes.has('SYSTEM_HEALTH_CHECK_FAILED')).toBe(true);
  });
});
