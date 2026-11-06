export const MAILTO_MAX_LENGTH = 1800

function q(value: string): string {
  return encodeURIComponent(value)
}

export function buildMailto(to: string, subject: string, body: string): string {
  return `mailto:${q(to)}?subject=${q(subject)}&body=${q(body)}`
}

export function buildMailtoToSubjectOnly(to: string, subject: string): string {
  return `mailto:${q(to)}?subject=${q(subject)}`
}

export function buildGmail(to: string, subject: string, body: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${q(to)}&su=${q(subject)}&body=${q(body)}`
}

export function buildGmailToSubjectOnly(to: string, subject: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${q(to)}&su=${q(subject)}`
}

export interface SendLinks {
  mailto: string
  gmail: string
  mailtoTooLong: boolean
  gmailTooLong: boolean
  tooLong: boolean
}

export function buildSendLinks(to: string, subject: string, body: string): SendLinks {
  const mailto = buildMailto(to, subject, body)
  const gmail = buildGmail(to, subject, body)
  const mailtoTooLong = mailto.length > MAILTO_MAX_LENGTH
  const gmailTooLong = gmail.length > MAILTO_MAX_LENGTH
  return { mailto, gmail, mailtoTooLong, gmailTooLong, tooLong: mailtoTooLong || gmailTooLong }
}
