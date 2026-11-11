import type { Bank } from '@/lib/types'

const DISPUTE_EMAILS: Record<string, string> = {
  gtbank: 'complaints@gtbank.com',
  'access bank': 'contactcenter@accessbankplc.com',
  zenith: 'zenithdirect@zenithbank.com',
  opay: 'support@opay-inc.com',
  moniepoint: 'support@moniepoint.com',
  kuda: 'help@kuda.com',
  'first bank': 'firstcontact@firstbanknigeria.com',
  uba: 'cfc@ubagroup.com',
  wema: 'disputes@wemabank.com',
}

export function suggestedDisputeEmail(
  bankName: string,
  banks: Pick<Bank, 'name' | 'dispute_email'>[] = [],
): string {
  const normalizedName = bankName.trim().toLowerCase()
  const configuredBank = banks.find((bank) => bank.name.trim().toLowerCase() === normalizedName)
  if (configuredBank?.dispute_email) return configuredBank.dispute_email

  const entry = Object.entries(DISPUTE_EMAILS).find(([key]) => normalizedName.includes(key))
  return entry?.[1] ?? ''
}

export function isKnownDisputeEmail(
  email: string,
  banks: Pick<Bank, 'dispute_email'>[] = [],
): boolean {
  const normalizedEmail = email.trim().toLowerCase()
  return Boolean(normalizedEmail) && (
    banks.some((bank) => bank.dispute_email.trim().toLowerCase() === normalizedEmail)
    || Object.values(DISPUTE_EMAILS).includes(normalizedEmail)
  )
}
