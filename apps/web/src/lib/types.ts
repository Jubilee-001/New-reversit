export type Channel = 'atm' | 'pos' | 'transfer' | 'web';

export type ProblemType =
  | 'failed_transfer'
  | 'duplicate_debit'
  | 'pos_web_failure'
  | 'atm_failure'
  | 'wrong_account';

export type CaseStatus = 'draft_ready' | 'sent' | 'bank_replied' | 'resolved' | 'escalated';

export interface DeadlineItem {
  key: string;
  label: string;
  problem_type: string;
  window_hours: number | null;
  window_by_channel?: Record<Channel, number>;
  verified: boolean;
  source: string;
  note: string;
}

export interface Bank {
  key: string;
  name: string;
  dispute_email: string;
  phone: string;
  source_url: string;
  verified: boolean;
  verified_on: string | null;
}

export interface EscalationContact {
  type: string;
  value: string;
  verified: boolean;
  source?: string;
  note?: string;
}

export interface EscalationTier {
  tier: number;
  title: string;
  when: string;
  verified: boolean;
  contacts: EscalationContact[];
  message: string;
}

export interface Config {
  deadlines: DeadlineItem[];
  deadline_last_checked: string | null;
  deadline_disclaimer: string;
  banks: Bank[];
  bank_disclaimer: string;
  escalation: EscalationTier[];
  problem_labels: Record<string, string>;
}

export interface DeadlineView {
  key: string;
  label: string;
  window_hours: number | null;
  verified: boolean;
  is_estimate: boolean;
  source: string;
  note: string;
}

export interface CaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
  problem_type: ProblemType;
  channel: Channel;
  bank_key: string | null;
  bank_name: string;
  amount: number;
  txn_date: string;
  txn_time: string;
  reference: string;
  account_last4: string | null;
  complaint_text: string;
  to_email: string;
  status: CaseStatus;
  sent_at: string | null;
  sent_at_source: 'confirmed_now' | 'user_entered' | null;
  deadline_at: string | null;
  bank_ticket: string | null;
  notes: string | null;
  resolved_at: string | null;
  escalated_at: string | null;
  escalation_tier: number | null;
  mail_opened: boolean;
  overdue: boolean;
  deadline: DeadlineView;
}

export interface ParsedFields {
  amount: string;
  date: string;
  time: string;
  channel: Channel | '';
  bank: string;
  reference: string;
  accountLast4: string;
}

export interface Draft {
  intakeMode: 'paste' | 'image' | 'manual';
  alertText: string;
  extractedText: string;
  fields: ParsedFields;
  missing: string[];
  problemType: ProblemType | null;
  caseId: string | null;
  apiError: string | null;
}

export interface ParseResult {
  amount?: number;
  date?: string;
  time?: string;
  channel?: Channel;
  bank?: string;
  reference?: string;
  session_id?: string;
  error?: string;
  missing?: string[];
}
