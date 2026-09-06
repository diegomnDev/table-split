/**
 * Who is responsible for the deployed app.
 *
 * These values appear verbatim in the legal notice and the privacy policy, so
 * they must be real: GDPR art. 13 requires the identity and contact details of
 * the controller, and a policy that names nobody protects nobody.
 *
 * FILL BEFORE DEPLOYING. The legal screen refuses to claim compliance while
 * any of these still holds its placeholder.
 */
export type Owner = {
  /** Full name or company name of whoever publishes the app. */
  name: string
  /** A contact address that is actually read. */
  email: string
  /** The domain the app is served from, without protocol. */
  domain: string
  /** Whether the app is offered as part of an economic activity. */
  commercial: boolean
}

export const PLACEHOLDER = 'POR RELLENAR'

export const OWNER: Owner = {
  name: PLACEHOLDER,
  email: PLACEHOLDER,
  domain: PLACEHOLDER,
  commercial: false,
}

export function ownerIsConfigured(owner: Owner = OWNER): boolean {
  return owner.name !== PLACEHOLDER && owner.email !== PLACEHOLDER && owner.domain !== PLACEHOLDER
}
