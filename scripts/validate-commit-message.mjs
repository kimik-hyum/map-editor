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

const hasHangul = /[가-힣]/.test(message);
const hasLatinLetters = /[A-Za-z]/.test(message);

if (!message) {
  console.error("커밋 메시지를 입력해주세요.");
  process.exit(1);
}

if (!hasHangul || hasLatinLetters) {
  console.error("커밋 메시지는 한글로만 작성해주세요. 영문 알파벳은 사용할 수 없습니다.");
  process.exit(1);
}
