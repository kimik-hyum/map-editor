import { readFileSync } from "node:fs";

const messagePath = process.argv[2];

if (!messagePath) {
  console.error("커밋 메시지 파일 경로를 찾을 수 없습니다.");
  process.exit(1);
}

const message = readFileSync(messagePath, "utf8")
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("#"))
  .join("\n")
  .trim();

const allowedTypes = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

if (!message) {
  console.error("커밋 메시지를 입력해주세요.");
  process.exit(1);
}

const [header = "", ...bodyLines] = message.split("\n");
const commitPattern = new RegExp(
  `^(${allowedTypes.join("|")})(\\([a-z0-9-]+\\))?!?:\\s+(.+)$`,
);
const match = header.match(commitPattern);

if (!match) {
  console.error(
    `커밋 메시지는 "${allowedTypes.join("|")}: 한글 메시지" 형식으로 작성해주세요.`,
  );
  process.exit(1);
}

const subject = match[3];
const body = bodyLines.join("\n").trim();
const koreanContent = [subject, body].filter(Boolean).join("\n");
const hasHangul = /[가-힣]/.test(koreanContent);

if (!hasHangul) {
  console.error(
    "커밋 타입 뒤의 메시지는 한글을 최소 1자 이상 포함해야 합니다. 영문 알파벳 혼용은 허용됩니다.",
  );
  process.exit(1);
}
