export function updateComplaintBankSalutation(text: string, bankName: string): string {
  const salutation = `Dear ${bankName.trim() || 'your bank'},`
  return text.replace(/^Dear [^\r\n]*,/i, salutation)
}
