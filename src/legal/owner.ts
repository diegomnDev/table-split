/**
 * Who is responsible for the deployed app.
 *
 * These values appear verbatim in the legal notice, so they must be real:
 * GDPR art. 13 requires the identity and contact details of the controller,
 * and a policy that names nobody protects nobody.
 */
export type Owner = {
  /** The name whoever publishes the app answers to. */
  name: string
  /** A contact address that is actually read. */
  email: string
}

export const PLACEHOLDER = 'SIN CONFIGURAR'

export const OWNER: Owner = {
  name: 'DiegoMN',
  email: 'chengokuu@gmail.com',
}

export function ownerIsConfigured(owner: Owner = OWNER): boolean {
  return owner.name !== PLACEHOLDER && owner.email !== PLACEHOLDER
}
