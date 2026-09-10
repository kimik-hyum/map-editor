import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isGoogleUser } from "./googleIdentity";

function userWithAppMetadata(appMetadata: User["app_metadata"]): User {
  return { app_metadata: appMetadata } as User;
}

describe("isGoogleUser", () => {
  it("accepts a primary Google identity", () => {
    expect(isGoogleUser(userWithAppMetadata({ provider: "google" }))).toBe(true);
  });

  it("accepts a linked Google identity", () => {
    expect(
      isGoogleUser(
        userWithAppMetadata({
          provider: "email",
          providers: ["email", "google"],
        }),
      ),
    ).toBe(true);
  });

  it("rejects non-Google and missing users", () => {
    expect(isGoogleUser(userWithAppMetadata({ provider: "email" }))).toBe(false);
    expect(isGoogleUser(null)).toBe(false);
  });
});
