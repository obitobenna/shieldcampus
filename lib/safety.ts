// Detects wallet secrets in free text (tutor chat) so they are never sent to the AI or stored.
// Shared by browser (blocks before sending) and server (defence in depth).
import { wordlist } from "@scure/bip39/wordlists/english";

const BIP39 = new Set(wordlist);

export type SecretKind = "seed_phrase" | "private_key";

/**
 * Flags 12+ consecutive BIP-39 words (recovery phrases are 12–24 such words).
 * Ordinary sentences break the run quickly because short words like "i", "to", "my", "is"
 * are not in the BIP-39 list.
 */
export function detectSecret(text: string): SecretKind | null {
  const lower = text.toLowerCase();
  if (/(secret-extended-key|xprv[1-9a-z]{20,}|zxsk|\busk1[02-9ac-hj-np-z]{20,})/.test(lower)) return "private_key";

  const tokens = lower.split(/[^a-z]+/).filter(Boolean);
  let run = 0;
  for (const t of tokens) {
    run = BIP39.has(t) ? run + 1 : 0;
    if (run >= 12) return "seed_phrase";
  }
  return null;
}

export const SECRET_WARNING: Record<"en" | "pcm", Record<SecretKind, string>> = {
  en: {
    seed_phrase:
      "Stop: that looks like a wallet recovery phrase, so it was not sent to the tutor and was not saved. Never share those words with anyone, including ShieldCampus, a tutor or \"support\". If anyone else has seen them, create a new wallet now and move your money into it.",
    private_key:
      "Stop: that looks like a private key, so it was not sent to the tutor and was not saved. Never share private keys with anyone. If someone else has seen it, move your money to a new wallet now.",
  },
  pcm: {
    seed_phrase:
      "Wait o: wetin you paste be like wallet recovery phrase, so we no send am give the tutor and we no save am. No ever share those words with anybody, even ShieldCampus, tutor or \"support\". If another person don see am, open new wallet sharp sharp and move your money enter am.",
    private_key:
      "Wait o: wetin you paste be like private key, so we no send am give the tutor and we no save am. No share private key with anybody. If another person don see am, move your money go new wallet now now.",
  },
};
