// Source of truth for ShieldCampus lessons. `npm run seed` upserts these into Supabase.
// Content is Markdown. Blockquotes that start with **Warning** or **Tip** render as callouts.

export interface SeedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SeedLesson {
  slug: string;
  position: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  rewardEligible: boolean;
  checkpoints: { id: string; label: string }[];
  content: string;
  questions: SeedQuestion[];
}

export const LESSONS: SeedLesson[] = [
  {
    slug: "why-privacy",
    position: 1,
    title: "Why your money needs privacy",
    summary:
      "Every payment tells a story about you. Learn who can read that story today, and why keeping it private is normal, not suspicious.",
    estimatedMinutes: 4,
    rewardEligible: false,
    checkpoints: [],
    content: `## Every payment tells a story

Think about the last five transfers you made. Maybe ₦1,500 to a bukka near Hostel B, ₦3,000 to the printing shop for your project, ₦5,000 to a friend who covered your data last week.

Each one says something about you: where you eat, where you spend time, who your friends are, and roughly how much money you have. Put enough payments together and anyone reading them can build a detailed picture of your life.

## Who can see your payments today

When you pay by bank transfer, the person you pay sees your full name, and your bank sees everything. That is usually fine. But it also means:

- **A vendor you paid once** now knows your full name and bank.
- **Anyone who sees your phone** can scroll your transaction history.
- **If you use a public blockchain**, like Bitcoin or a regular transparent wallet, every payment is visible to the whole internet, forever. Anyone who learns your address can see your balance and every payment you have ever made from it.

## Privacy is not about hiding wrongdoing

You close the door when you use the bathroom. You don't post your bank statement on your WhatsApp status. That is not because you are doing something wrong. It is because some things are yours.

Financial privacy protects you from very real risks:

- **Scammers and fraudsters** target people who look like they have money.
- **Social pressure**: when people can see what you receive, requests and expectations follow.
- **Profiling**: companies can use your spending patterns to decide what to charge you or what to offer you.
- **Personal safety**: knowing someone's balance and daily routine makes them a target.

## Privacy with accountability

Good financial privacy does not mean "nobody can ever check anything." It means **you decide** who sees what. Later in this course you will learn about viewing keys, which let you show your payments to someone you trust, like a sponsor or an auditor, without showing them to the whole world.

> **Tip** — A useful test: would you be comfortable if a stranger could read this payment? If not, it deserves privacy.

## What's next

In the next lesson you'll meet Zcash, a digital currency built so that your payments can be private by default.`,
    questions: [
      {
        question: "If you pay from a regular transparent crypto wallet, who can see that payment?",
        options: [
          "Only you and the person you paid",
          "Anyone on the internet who knows the address",
          "Only your bank",
          "Nobody, crypto is always private",
        ],
        correctIndex: 1,
        explanation:
          "Transparent blockchains publish every payment. Anyone who knows your address can see your balance and history.",
      },
      {
        question: "Which of these is a real risk of having your payments visible to everyone?",
        options: [
          "Your phone battery drains faster",
          "Your payments become slower",
          "Scammers can see who has money and target them",
          "Your exam results are affected",
        ],
        correctIndex: 2,
        explanation:
          "Visible balances and spending patterns make people targets for scams, pressure and profiling.",
      },
      {
        question: "What does 'privacy with accountability' mean?",
        options: [
          "Nobody can ever check any payment",
          "Everyone can see every payment",
          "You choose who can see your payments, for example an auditor",
          "Only the government can see payments",
        ],
        correctIndex: 2,
        explanation:
          "You stay in control. You can share proof of your payments with people you choose, without exposing them to the public.",
      },
    ],
  },
  {
    slug: "what-is-zcash",
    position: 2,
    title: "What is Zcash? Transparent vs shielded",
    summary:
      "Zcash is digital money that can keep the sender, receiver and amount private. Learn the difference between transparent and shielded addresses.",
    estimatedMinutes: 5,
    rewardEligible: false,
    checkpoints: [],
    content: `## Zcash in one sentence

Zcash (ticker: **ZEC**) is a digital currency that lets you send money to anyone, anywhere, with the option to keep **who sent it, who received it and how much** private.

It launched in 2016 and uses a kind of cryptography called **zero-knowledge proofs**. In simple terms: the network can confirm that a payment is valid (you really had the money, and you didn't spend it twice) without seeing the details of the payment.

## Two kinds of addresses

A Zcash address is like an account number. There are two families:

| | Transparent | Shielded |
|---|---|---|
| Starts with | \`t1\` or \`t3\` | \`u1\` (unified) or \`zs1\` (Sapling) |
| Sender visible? | Yes, to everyone | No |
| Receiver visible? | Yes, to everyone | No |
| Amount visible? | Yes, to everyone | No |
| Can carry a private memo? | No | Yes |

Transparent addresses work like Bitcoin: everything is public. **Shielded addresses are where Zcash's privacy lives.**

## Unified addresses

Modern Zcash wallets give you a **unified address** that starts with \`u1\`. It is long (more than 100 characters) because it bundles several receivers together. Your wallet handles that for you; you just copy and share it, or show it as a QR code.

When someone sends ZEC to your unified address, a good wallet will use the most private option available automatically.

## A shielded payment from the outside

When a shielded payment happens, the public blockchain records that *a* transaction happened, and the network verifies it is valid. But an outside observer cannot see:

- who paid,
- who got paid,
- how much moved,
- or the memo attached to it.

## Why this matters for you

On ShieldCampus, everything uses shielded addresses. Your reward goes to a shielded address. Vendors on campus receive payments at shielded addresses. Nobody scrolling the blockchain can see what you bought at Mama Nkechi's Kitchen.

> **Tip** — We never ask for a transparent address (starting with \`t1\`). If you paste one, we'll explain why and ask for your shielded one.

## What's next

Next you'll install a Zcash wallet on your phone and get your own shielded address.`,
    questions: [
      {
        question: "Which of these is a shielded Zcash address?",
        options: [
          "An address starting with t1",
          "An address starting with u1",
          "Your bank account number",
          "Your email address",
        ],
        correctIndex: 1,
        explanation:
          "Unified addresses start with u1 and Sapling addresses with zs1. Addresses starting with t1 or t3 are transparent.",
      },
      {
        question: "In a shielded payment, what can an outside observer see?",
        options: [
          "The sender and the amount",
          "The receiver only",
          "The memo text",
          "That a valid transaction happened, but not who, to whom, or how much",
        ],
        correctIndex: 3,
        explanation:
          "Zero-knowledge proofs let the network verify the payment without revealing its details.",
      },
      {
        question: "What does a zero-knowledge proof let the Zcash network do?",
        options: [
          "Print new ZEC for free",
          "Confirm a payment is valid without seeing its private details",
          "Reverse a payment you regret",
          "Recover your wallet if you lose your phone",
        ],
        correctIndex: 1,
        explanation:
          "The proof shows the payment follows the rules (real funds, no double spending) while keeping details private.",
      },
    ],
  },
  {
    slug: "wallet-setup",
    position: 3,
    title: "Set up your Zcash wallet",
    summary:
      "Install a shielded Zcash wallet, back up your recovery phrase safely, and find your shielded address. Tick each checkpoint as you go.",
    estimatedMinutes: 10,
    rewardEligible: true,
    checkpoints: [
      { id: "installed", label: "I installed a Zcash wallet (Zodl or another shielded wallet)" },
      { id: "created", label: "I created a new wallet in the app" },
      { id: "backup", label: "I wrote my recovery phrase on paper and kept it somewhere safe" },
      { id: "address", label: "I found my shielded receive address (starts with u1)" },
      { id: "copied", label: "I copied my address and can paste it" },
    ],
    content: `> **Warning** — Your wallet's **recovery phrase** (also called a seed phrase: 24 secret words) is the master key to your money. **Never share it with anyone.** Not a friend, not a lecturer, not "support", not ShieldCampus. We will never ask for it. Anyone who has those words can take all your money, and nobody can reverse it.

## Step 1: Install a shielded wallet

We recommend **Zodl** (formerly Zashi), a free mobile wallet that is shielded by default.

- **Android**: open the Google Play Store and search for **Zodl**.
- **iPhone**: open the App Store and search for **Zodl**.

Check the publisher carefully and avoid look-alike apps. Other shielded wallets such as **Ywallet** or **Zingo** also work with ShieldCampus. The steps below are similar in each.

## Step 2: Create a new wallet

Open the app and choose **Create new wallet**. Set a PIN or turn on your phone's fingerprint or face lock when asked. This protects the app if someone picks up your phone.

## Step 3: Back up your recovery phrase

The app will show you a list of secret words. This is your recovery phrase.

1. Write the words **on paper**, in order, with the numbers.
2. Do **not** screenshot them, email them, or send them on WhatsApp. Screenshots get backed up to the cloud and shared by accident.
3. Keep the paper somewhere safe and private, like inside a book at home, not in your wallet or phone case.
4. If the app asks you to confirm some of the words, do it carefully.

If you lose your phone, those words are the only way to get your money back. If someone else sees them, they can take your money.

## Step 4: Find your shielded address

In the app, tap **Receive**. You will see a long address that starts with \`u1\`, plus a QR code. This is your **shielded unified address**. It is safe to share: people can send you money with it, but they cannot take money with it.

> **Tip** — Some wallets also show a transparent address (starting with \`t1\`). Always share the \`u1\` shielded one.

## Step 5: Copy your address

Tap the copy button next to the address. In the next lesson you'll learn how payment requests and QR codes work, and after you pass this lesson and the next one, you can paste this address to claim your first shielded ZEC reward.

## Safety checklist

- My recovery phrase is on paper, not on my phone.
- I have not shared it with anyone, including anyone who says they are "support".
- My wallet app is locked with a PIN or fingerprint.
- I know that my \`u1\` address is safe to share, and my recovery phrase is not.`,
    questions: [
      {
        question: "Someone on WhatsApp says they are 'Zcash support' and asks for your recovery phrase to fix your wallet. What do you do?",
        options: [
          "Send it, they are support",
          "Send only half of the words",
          "Refuse. Never share your recovery phrase with anyone",
          "Send a screenshot instead of typing it",
        ],
        correctIndex: 2,
        explanation:
          "Real support never asks for your recovery phrase. Anyone with those words can take all your money.",
      },
      {
        question: "Where is the safest place to keep your recovery phrase?",
        options: [
          "A screenshot in your gallery",
          "Written on paper, stored somewhere private",
          "In a WhatsApp message to yourself",
          "In your email drafts",
        ],
        correctIndex: 1,
        explanation:
          "Paper stored privately can't be hacked or synced to the cloud. Screenshots and messages can leak.",
      },
      {
        question: "Which of these is safe to share so someone can pay you?",
        options: [
          "Your recovery phrase",
          "Your wallet PIN",
          "Your shielded address starting with u1",
          "Your phone's lock code",
        ],
        correctIndex: 2,
        explanation:
          "Your receive address lets people send you money, but nobody can spend your funds with it.",
      },
    ],
  },
  {
    slug: "send-receive-privately",
    position: 4,
    title: "Sending and receiving privately",
    summary:
      "Learn how payment requests work: ZIP-321 QR codes that fill in the address, amount and memo for you, and how private memos work.",
    estimatedMinutes: 6,
    rewardEligible: true,
    checkpoints: [],
    content: `## Receiving: share your address or a QR code

To receive ZEC, you share your shielded \`u1\` address. Because it is long, it's easiest to show the **QR code** from your wallet's Receive screen and let the other person scan it.

## Paying: scan, check, send

When you pay someone, your wallet needs three things:

1. **The address** to send to.
2. **The amount** in ZEC.
3. Optionally, a **memo**: a short private note attached to the payment.

Typing a 100-character address by hand is slow and risky. That's why Zcash has a standard called **ZIP-321** for payment requests.

## ZIP-321 payment requests

A ZIP-321 request packs the address, amount and memo into one link that starts with \`zcash:\`, like this:

\`zcash:u1abc...xyz?amount=0.025&memo=U2hpZWxkQ2FtcHVzIHNhbGUgIzQy\`

When it's shown as a QR code, you scan it with your wallet and everything is filled in automatically. You just check and confirm.

On campus, vendors on ShieldCampus show exactly this kind of QR code. The price is shown in **naira**, converted to ZEC at the current rate, so you always know what you are paying.

> **Tip** — Always check the amount on your wallet's confirmation screen before you send. A payment cannot be reversed once it is sent.

## Memos: private notes

Shielded payments can carry a memo of up to 512 bytes. The memo is **encrypted**: only the sender and the receiver can read it. Vendors use memos like "ShieldCampus sale #42" to match your payment to your order. Your reward will arrive with a memo like "ShieldCampus reward #7".

Never put anything sensitive in a memo that the receiver shouldn't see, like a password.

## How long does a payment take?

A Zcash block is produced about every 75 seconds. Most wallets show an incoming payment within a minute or two, and it becomes fully confirmed shortly after. Vendors on ShieldCampus wait until they see the payment in their wallet before marking a sale as paid.

## What's next

Pass this quiz, and you can claim your first shielded ZEC reward from the ShieldCampus reward fund. Then you'll learn how viewing keys let sponsors check that the fund is honest without exposing you.`,
    questions: [
      {
        question: "What does a ZIP-321 QR code contain?",
        options: [
          "The receiver's recovery phrase",
          "The address, amount and optional memo for a payment",
          "Your bank account details",
          "A link to download a wallet",
        ],
        correctIndex: 1,
        explanation:
          "A ZIP-321 request bundles the address, amount and memo so your wallet can fill them in for you.",
      },
      {
        question: "Who can read the memo on a shielded payment?",
        options: [
          "Anyone on the internet",
          "Only the sender and the receiver",
          "Only miners",
          "Nobody, not even the receiver",
        ],
        correctIndex: 1,
        explanation: "Shielded memos are encrypted so only the sender and receiver can read them.",
      },
      {
        question: "What should you do before confirming a payment in your wallet?",
        options: [
          "Check the amount and recipient on the confirmation screen",
          "Share your recovery phrase with the vendor",
          "Switch to a transparent address",
          "Nothing, payments can always be reversed",
        ],
        correctIndex: 0,
        explanation: "Payments can't be reversed, so always confirm the details before sending.",
      },
    ],
  },
  {
    slug: "viewing-keys",
    position: 5,
    title: "Viewing keys: privacy with accountability",
    summary:
      "A viewing key lets someone see a wallet's payments without being able to spend. Learn how sponsors audit ShieldCampus while your payments stay private.",
    estimatedMinutes: 5,
    rewardEligible: false,
    checkpoints: [],
    content: `## The problem: trust without exposure

Sponsors give money to ShieldCampus so students can receive their first ZEC. A sponsor naturally wants to know: did the money really reach students? How much went out? Was any of it wasted?

On a transparent blockchain you would answer by making everything public, which exposes every student. Zcash has a better answer.

## What is a viewing key?

A **viewing key** is a special key that lets someone **see** the payments of a wallet, but **not spend** from it.

Think of it like giving an accountant read-only access to a bank statement. They can check every line, but they cannot move a single naira.

| Key | What it can do | Share it? |
|---|---|---|
| Recovery phrase / spending key | Spend everything | **Never** |
| Full viewing key | See incoming and outgoing payments | Only with people you trust to audit you |
| Address | Receive payments | Yes |

## How ShieldCampus uses viewing keys

The ShieldCampus **reward fund** is a shielded wallet. We share its viewing key with sponsors and auditors only. With it they can confirm:

- every reward that left the fund,
- the amount of each one,
- the memo ("ShieldCampus reward #12") that links it to a claim.

The public impact dashboard shows only totals: how many students, how many rewards, how much volume. The sponsor's audit view shows each payout by ID and transaction ID, **never your name or your address**.

Your own wallet stays fully yours. The reward fund's viewing key shows money **leaving the fund**. It cannot see what you do with your ZEC afterwards.

> **Warning** — A viewing key is not as dangerous as a recovery phrase, but it still reveals payment history. Only share your own viewing key with someone you have a real reason to trust, for example an accountant or an auditor.

## Why this matters

This is what privacy with accountability looks like in practice. Sponsors can verify the impact of their money. Students keep their privacy. Nobody needs to choose between being honest and being safe.

## You've finished the course

You now understand why financial privacy matters, how shielded Zcash payments work, how to keep your wallet safe, how payment requests and memos work, and how viewing keys enable trust without exposure. Spend your ZEC at a campus vendor who accepts it, and help a friend make their first private payment.`,
    questions: [
      {
        question: "What can someone do with a viewing key?",
        options: [
          "Spend all the money in the wallet",
          "See the wallet's payments, but not spend",
          "Change the wallet's PIN",
          "Nothing at all",
        ],
        correctIndex: 1,
        explanation: "A viewing key is read-only: it reveals payments but can never spend funds.",
      },
      {
        question: "What does the ShieldCampus sponsor audit view show?",
        options: [
          "Each student's name and address",
          "Payout IDs, amounts and transaction IDs, without names or addresses",
          "Every student's recovery phrase",
          "Nothing, it is empty",
        ],
        correctIndex: 1,
        explanation: "Auditors can check every payout by ID while students' identities stay private.",
      },
      {
        question: "Which key should you never share with anyone?",
        options: [
          "Your shielded address",
          "Your recovery phrase",
          "A payment QR code",
          "A transaction ID",
        ],
        correctIndex: 1,
        explanation: "Your recovery phrase can spend everything. Never share it, with anyone.",
      },
    ],
  },
];
