import { describe, it, expect } from 'vitest'
import {
  buildMailto,
  buildGmail,
  buildMailtoToSubjectOnly,
  buildGmailToSubjectOnly,
  buildSendLinks,
  MAILTO_MAX_LENGTH,
} from '@/lib/mailto'

describe('mailto and Gmail builders', () => {
  const to = 'disputes@examplebank.com'
  const subject = 'Dispute: failed transfer NGN 1,000.00 Ref REF123'
  const body = 'Dear ExampleBank,\n\nI am writing to formally complain...'

  it('builds a mailto link with to, subject and body', () => {
    const link = buildMailto(to, subject, body)
    expect(link).toMatch(/^mailto:/)
    expect(link).toContain(`subject=${encodeURIComponent(subject)}`)
    expect(link).toContain(`body=${encodeURIComponent(body)}`)
  })

  it('builds a Gmail link with to, subject and body', () => {
    const link = buildGmail(to, subject, body)
    expect(link).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&/)
    expect(link).toContain(`to=${encodeURIComponent(to)}`)
    expect(link).toContain(`su=${encodeURIComponent(subject)}`)
    expect(link).toContain(`body=${encodeURIComponent(body)}`)
  })

  it('builds to-subject-only mailto fallback', () => {
    const link = buildMailtoToSubjectOnly(to, subject)
    expect(link).toMatch(/^mailto:/)
    expect(link).toContain(`subject=${encodeURIComponent(subject)}`)
    expect(link).not.toContain('body=')
  })

  it('builds to-subject-only Gmail fallback', () => {
    const link = buildGmailToSubjectOnly(to, subject)
    expect(link).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&/)
    expect(link).toContain(`to=${encodeURIComponent(to)}`)
    expect(link).not.toContain('body=')
  })

  it('detects when mailto is too long (>1800 chars)', () => {
    const longBody = 'x'.repeat(3000)
    const links = buildSendLinks(to, subject, longBody)
    expect(links.mailtoTooLong).toBe(true)
    expect(links.tooLong).toBe(true)
  })

  it('does not flag short links as too long', () => {
    const links = buildSendLinks(to, subject, body)
    expect(links.mailtoTooLong).toBe(false)
    expect(links.tooLong).toBe(false)
  })

  it('MAILTO_MAX_LENGTH is 1800', () => {
    expect(MAILTO_MAX_LENGTH).toBe(1800)
  })

  it('encodes special characters in to address', () => {
    const link = buildMailto('a b@example.com', 'hi', 'there')
    expect(link).toContain('a%20b%40example.com')
  })

  it('encodes newlines in body', () => {
    const link = buildMailto(to, subject, 'line1\nline2')
    expect(link).toContain('line1%0Aline2')
  })
})
