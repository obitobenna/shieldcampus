import { describe, expect, it } from "vitest";
import { detectSecret } from "@/lib/safety";

describe("detectSecret", () => {
  it("catches a 12-word recovery phrase", () => {
    expect(detectSecret("abandon ability able about above absent absorb abstract absurd abuse access accident")).toBe("seed_phrase");
  });

  it("catches a 24-word phrase pasted with numbers, commas and line breaks", () => {
    const words =
      "legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title".split(" ");
    const pasted = words.map((w, i) => `${i + 1}. ${w}`).join(",\n");
    expect(detectSecret(`my words are: ${pasted} is it safe?`)).toBe("seed_phrase");
  });

  it("catches a phrase in capitals inside a sentence", () => {
    expect(detectSecret("Support asked for these: ZOO ZONE YOUTH YELLOW WORLD WORTH WRAP WRONG YARD YEAR YOUNG ZERO")).toBe("seed_phrase");
  });

  it("catches private keys", () => {
    expect(detectSecret("here: secret-extended-key-main1qwerty")).toBe("private_key");
  });

  it("does not flag normal questions, in English or Pidgin", () => {
    const questions = [
      "If I am not doing anything wrong, why do I need privacy for my money at all?",
      "Wetin be the difference between t1 address and u1 address? Abeg explain am well well",
      "What happens if I lose my phone and I have written my recovery phrase on paper at home?",
      "Can you explain about the shield and how the network will verify a payment without seeing the amount?",
      "u1l8xunezsvhq8fgzfl7404m450nwnd76zshscn6nfys7vyz2ywyh4cc5daaq0c7q2su5lqfh23sp7fkf3kt27ve5948mzpfdvckzaect2jtte308",
      "The txid is 9f2c1e0b5a6d7c8e9f2c1e0b5a6d7c8e9f2c1e0b5a6d7c8e9f2c1e0b5a6d7c8e, has it arrived?",
    ];
    for (const q of questions) expect(detectSecret(q)).toBeNull();
  });
});
