export interface BankDirectoryEntry {
  fullName: string
  shortName: string
  email: string
  logo: string | null
  aliases: string[]
}

export const BANK_DIRECTORY: Record<string, BankDirectoryEntry> = {
  access: {
    fullName: 'Access Bank Plc',
    shortName: 'Access Bank',
    email: 'contactcenter@accessbankplc.com',
    logo: '/bank-logos/access.png',
    aliases: ['access', 'access bank', 'access bank plc'],
  },
  zenith: {
    fullName: 'Zenith Bank Plc',
    shortName: 'Zenith Bank',
    email: 'zenithdirect@zenithbank.com',
    logo: '/bank-logos/zenith.png',
    aliases: ['zenith', 'zenith bank', 'zenith bank plc'],
  },
  gtbank: {
    fullName: 'Guaranty Trust Bank (GTBank)',
    shortName: 'GTBank',
    email: 'complaints@gtbank.com',
    logo: '/bank-logos/gtbank.png',
    aliases: ['gtbank', 'gtb', 'guaranty trust', 'guaranty trust bank', 'guaranty trust bank plc'],
  },
  gtco: {
    fullName: 'Guaranty Trust Bank (GTBank)',
    shortName: 'GTBank',
    email: 'complaints@gtbank.com',
    logo: '/bank-logos/gtbank.png',
    aliases: ['gtco', 'gt co'],
  },
  opay: {
    fullName: 'OPay Digital Services Limited',
    shortName: 'OPay',
    email: 'support@opay-inc.com',
    logo: '/bank-logos/opay.png',
    aliases: ['opay', 'opay digital services limited'],
  },
  moniepoint: {
    fullName: 'Moniepoint Microfinance Bank',
    shortName: 'Moniepoint',
    email: 'support@moniepoint.com',
    logo: '/bank-logos/moniepoint.png',
    aliases: ['moniepoint', 'moniepoint microfinance bank'],
  },
  kuda: {
    fullName: 'Kuda Microfinance Bank',
    shortName: 'Kuda Bank',
    email: 'help@kuda.com',
    logo: '/bank-logos/kuda.png',
    aliases: ['kuda', 'kuda bank', 'kuda microfinance bank'],
  },
  palmpay: {
    fullName: 'PalmPay Limited',
    shortName: 'PalmPay',
    email: 'support@palmpay.com',
    logo: '/bank-logos/palmpay.png',
    aliases: ['palmpay', 'palmpay nigeria', 'palmpay limited'],
  },
  uba: {
    fullName: 'United Bank for Africa (UBA)',
    shortName: 'UBA',
    email: 'cfc@ubagroup.com',
    logo: '/bank-logos/uba.png',
    aliases: ['uba', 'united bank for africa'],
  },
  firstbank: {
    fullName: 'First Bank of Nigeria',
    shortName: 'First Bank',
    email: 'firstcontact@firstbanknigeria.com',
    logo: '/bank-logos/firstbank.png',
    aliases: ['firstbank', 'first bank', 'first bank of nigeria'],
  },
}

const UNKNOWN_BANK: Omit<BankDirectoryEntry, 'aliases'> = {
  fullName: 'Commercial Bank / Dispute Desk',
  shortName: 'Your Bank',
  email: '',
  logo: null,
}

function normalizeBankInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function resolveBank(
  bankInput: string | null | undefined,
  bankKey?: string | null,
): Omit<BankDirectoryEntry, 'aliases'> {
  const key = bankKey?.trim().toLowerCase()
  if (key && BANK_DIRECTORY[key]) return BANK_DIRECTORY[key]
  if (!bankInput?.trim()) return UNKNOWN_BANK

  const normalizedInput = normalizeBankInput(bankInput)
  const match = Object.values(BANK_DIRECTORY)
    .flatMap((bank) => bank.aliases.map((alias) => ({
      bank,
      normalizedAlias: normalizeBankInput(alias),
    })))
    .sort((left, right) => right.normalizedAlias.length - left.normalizedAlias.length)
    .find(({ normalizedAlias }) => normalizedInput.includes(normalizedAlias))

  if (match) return match.bank

  return {
    fullName: bankInput,
    shortName: bankInput,
    email: '',
    logo: null,
  }
}
