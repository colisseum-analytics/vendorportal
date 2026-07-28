export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 10 characters', test: (p) => p.length >= 10 },
  { key: 'lower', label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'upper', label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'number', label: 'A number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'A special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function passwordIssues(password) {
  return PASSWORD_RULES.filter((r) => !r.test(password))
}

export function isPasswordValid(password) {
  return passwordIssues(password).length === 0
}
