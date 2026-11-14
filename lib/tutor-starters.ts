// Suggested first questions shown in the tutor panel, per lesson and language.
type Lang = "en" | "pcm";

const STARTERS: Record<string, Record<Lang, string[]>> = {
  "why-privacy": {
    en: ["If I'm not doing anything wrong, why do I need privacy?", "Who can see my bank transfers?", "What is privacy with accountability?"],
    pcm: ["If I no dey do anything bad, why I need privacy?", "Who fit see my bank transfer?", "Wetin be privacy with accountability?"],
  },
  "what-is-zcash": {
    en: ["What's the difference between t1 and u1 addresses?", "How can a payment be private but still verified?", "Is Zcash the same as Bitcoin?"],
    pcm: ["Wetin be difference between t1 and u1 address?", "How payment go dey private but still correct?", "Zcash and Bitcoin na the same thing?"],
  },
  "wallet-setup": {
    en: ["Where should I keep my recovery phrase?", "Which address do I copy, t1 or u1?", "What happens if I lose my phone?"],
    pcm: ["Where I suppose keep my recovery phrase?", "Which address I go copy, t1 or u1?", "Wetin go happen if my phone loss?"],
  },
  "send-receive-privately": {
    en: ["How does a payment QR code work?", "Who can read my memo?", "How long does a payment take?"],
    pcm: ["How payment QR code dey work?", "Who fit read my memo?", "How long payment dey take?"],
  },
  "viewing-keys": {
    en: ["Can a viewing key spend my money?", "How do sponsors check the reward fund?", "Should I share my own viewing key?"],
    pcm: ["Viewing key fit spend my money?", "How sponsors dey check the reward fund?", "Make I share my own viewing key?"],
  },
};

const DEFAULT: Record<Lang, string[]> = {
  en: ["What is a shielded address?", "How do I stay safe from crypto scams?", "How do I earn my reward?"],
  pcm: ["Wetin be shielded address?", "How I go take avoid crypto scam?", "How I go collect my reward?"],
};

export function tutorStarters(slug: string | null, lang: Lang): string[] {
  return (slug && STARTERS[slug]?.[lang]) || DEFAULT[lang];
}
