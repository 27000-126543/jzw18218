import CryptoJS from 'crypto-js'

const DEFAULT_MASTER_KEY = 'ssh-manager-default-secret-key-2024'

function getMasterKey(): string {
  return process.env.SSH_MANAGER_MASTER_KEY || DEFAULT_MASTER_KEY
}

export function encrypt(text: string, key?: string): string {
  const secretKey = key || getMasterKey()
  return CryptoJS.AES.encrypt(text, secretKey).toString()
}

export function decrypt(encrypted: string, key?: string): string {
  const secretKey = key || getMasterKey()
  const bytes = CryptoJS.AES.decrypt(encrypted, secretKey)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export function encryptIfDefined(text: string | undefined, key?: string): string | undefined {
  if (text === undefined) {
    return undefined
  }
  return encrypt(text, key)
}

export function decryptIfDefined(encrypted: string | undefined, key?: string): string | undefined {
  if (encrypted === undefined) {
    return undefined
  }
  return decrypt(encrypted, key)
}
