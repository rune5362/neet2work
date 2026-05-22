import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.service.js";

describe("password service", () => {
  it("hashes passwords with a salt and verifies them", async () => {
    const passwordHash = await hashPassword("StrongPass1");

    expect(passwordHash).not.toBe("StrongPass1");
    expect(passwordHash.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword("StrongPass1", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPass1", passwordHash)).resolves.toBe(false);
  });
});
