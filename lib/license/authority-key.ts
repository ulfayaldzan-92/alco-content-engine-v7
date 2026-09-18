/**
 * ALCO Authority Public Key Configuration
 * HARD CONTRACT (ALCO LICENSE STANDARD v1.0 Section 3):
 *
 * Official Authority Ed25519 Public Key HEX:
 * 7a8e99b9ba45bc9f8847bc9fc4952a87b7fa22a3b0c09a5b22ed939de0ed5162
 * Fingerprint: 7A8E99B9...E0ED5162
 *
 * Distributed apps MUST ONLY hold the Authority Public Key.
 * Private signing keys MUST NEVER be present in the user app, public repository, UI, or installer.
 */

export const ALCO_AUTHORITY_PUBLIC_KEY_HEX = '7a8e99b9ba45bc9f8847bc9fc4952a87b7fa22a3b0c09a5b22ed939de0ed5162';

export const ALCO_AUTHORITY_PUBLIC_KEY_SPKI = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAeo6ZubpFvJ+IR7yfxJUqh7f6IqOwwJpbIu2TneDtUWI=
-----END PUBLIC KEY-----`;

export const ALCO_APP_ID = 'alco-content-engine';
