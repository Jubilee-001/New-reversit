import { describe, expect, it } from 'vitest'
import { isKnownDisputeEmail, suggestedDisputeEmail } from '@/lib/bankDispatch'
import { updateComplaintBankSalutation } from '@/lib/complaint'

describe('dynamic bank complaint details', () => {
  it('uses the detected bank for the dispute email', () => {
    expect(suggestedDisputeEmail('Zenith Bank')).toBe('zenithdirect@zenithbank.com')
  })

  it('uses configured dispute emails for the detected bank', () => {
    expect(suggestedDisputeEmail('Wema Bank', [
      { name: 'Wema Bank', dispute_email: 'disputes@wemabank.com' },
    ])).toBe('disputes@wemabank.com')
  })

  it('recognizes a prior bank-specific suggestion so it can be refreshed', () => {
    expect(isKnownDisputeEmail('complaints@gtbank.com')).toBe(true)
  })

  it('updates the letterhead salutation to the detected bank', () => {
    const letter = updateComplaintBankSalutation(
      'Dear GTBank,\n\nI am disputing this debit.',
      'Zenith Bank',
    )

    expect(letter).toBe('Dear Zenith Bank,\n\nI am disputing this debit.')
  })
})
