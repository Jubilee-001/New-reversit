import { describe, expect, it } from 'vitest'
import { isKnownDisputeEmail, suggestedDisputeEmail } from '@/lib/bankDispatch'
import { BANK_DIRECTORY, resolveBank } from '@/lib/bankAssets'
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

  it('resolves detected bank aliases to their logo and official legal name', () => {
    expect(resolveBank('GTCO')).toEqual(BANK_DIRECTORY.gtco)
    expect(resolveBank('zEnItH bAnK')).toMatchObject({
      fullName: 'Zenith Bank Plc',
      shortName: 'Zenith Bank',
      logo: '/bank-logos/zenith.png',
    })
  })

  it('returns no asset for an unregistered bank', () => {
    expect(resolveBank('Example Bank')).toMatchObject({
      fullName: 'Example Bank',
      shortName: 'Example Bank',
      logo: null,
    })
  })

  it('uses the fallback when the bank is missing', () => {
    expect(resolveBank('')).toMatchObject({
      fullName: 'Commercial Bank / Dispute Desk',
      shortName: 'Your Bank',
      logo: null,
    })
  })
})
