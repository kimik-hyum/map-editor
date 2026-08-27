import { describe, expect, it } from "vitest";
import {
  isAllowedParentOrigin,
  resolveReadyTargetOrigins,
} from "./editorMessageChannel";

const editorOrigin = "http://127.0.0.1:4174";

describe("isAllowedParentOrigin", () => {
  it("wildcard 정책에서 모든 HTTPS 부모 origin을 허용한다", () => {
    expect(
      isAllowedParentOrigin("https://service.example.com", ["*"], editorOrigin),
    ).toBe(true);
    expect(
      isAllowedParentOrigin("https://another.example:8443", ["*"], editorOrigin),
    ).toBe(true);
  });

  it("wildcard 정책에서도 null과 다른 HTTP origin을 거부한다", () => {
    expect(isAllowedParentOrigin("null", ["*"], editorOrigin)).toBe(false);
    expect(isAllowedParentOrigin("http://untrusted.example", ["*"], editorOrigin)).toBe(
      false,
    );
    expect(
      isAllowedParentOrigin("https://service.example.com/path", ["*"], editorOrigin),
    ).toBe(false);
  });

  it("로컬 개발을 위해 에디터와 동일한 HTTP origin은 허용한다", () => {
    expect(isAllowedParentOrigin(editorOrigin, ["*"], editorOrigin)).toBe(true);
  });

  it("명시적 allowlist에서는 정확히 일치하는 origin만 허용한다", () => {
    const allowedOrigins = ["https://service.example.com", "http://localhost:3000"];

    expect(
      isAllowedParentOrigin(
        "https://service.example.com",
        allowedOrigins,
        editorOrigin,
      ),
    ).toBe(true);
    expect(
      isAllowedParentOrigin("http://localhost:3000", allowedOrigins, editorOrigin),
    ).toBe(true);
    expect(
      isAllowedParentOrigin(
        "https://service.example.com.evil.test",
        allowedOrigins,
        editorOrigin,
      ),
    ).toBe(false);
  });
});

describe("resolveReadyTargetOrigins", () => {
  it("wildcard 정책에서는 데이터 없는 READY의 bootstrap target만 wildcard로 둔다", () => {
    expect(resolveReadyTargetOrigins(["*"], editorOrigin)).toEqual(["*"]);
  });

  it("명시적 allowlist에서는 모든 origin을 READY 대상으로 사용한다", () => {
    expect(
      resolveReadyTargetOrigins(
        ["https://service.example.com", "https://admin.example.com"],
        editorOrigin,
      ),
    ).toEqual(["https://service.example.com", "https://admin.example.com"]);
  });
});
