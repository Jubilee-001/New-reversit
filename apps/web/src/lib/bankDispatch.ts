import type { Bank } from '@/lib/types'
import { BANK_DIRECTORY, resolveBank } from '@/lib/bankAssets'

export function suggestedDisputeEmail(
  bankName: string,
  banks: Pick<Bank, 'name' | 'dispute_email'>[] = [],
): string {
  const normalizedName = bankName.trim().toLowerCase()
  const configuredBank = banks.find((bank) => bank.name.trim().toLowerCase() === normalizedName)
  if (configuredBank?.dispute_email) return configuredBank.dispute_email

  return resolveBank(bankName).email || (normalizedName.includes('wema') ? 'disputes@wemabank.com' : '')
}

export function isKnownDisputeEmail(
  email: string,
  banks: Pick<Bank, 'dispute_email'>[] = [],
): boolean {
  const normalizedEmail = email.trim().toLowerCase()
  return Boolean(normalizedEmail) && (
    banks.some((bank) => bank.dispute_email.trim().toLowerCase() === normalizedEmail)
    || Object.values(BANK_DIRECTORY).some((bank) => bank.email === normalizedEmail)
    || normalizedEmail === 'disputes@wemabank.com'
  )
}
