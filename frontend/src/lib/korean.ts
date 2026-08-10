/**
 * 한국어 조사 처리
 *
 * 캐릭터 고정 첫 대사에 아이 이름 치환 자리가 있다. (작업 분장 2.2)
 *   대화1: "ㅇㅇ아, 내 방귀가..."
 *   대화4: "ㅇㅇ이 덕분에..."
 *
 * 받침 유무에 따라 조사가 달라지므로 단순 문자열 치환으로는 틀린다.
 *   민준(받침 O) → "민준아", "민준이 덕분에"
 *   지호(받침 X) → "지호야", "지호 덕분에"
 *
 * 실제 서비스에서는 백엔드가 치환해 내려준다. 화면·TTS·AI에 전달되는 텍스트가
 * 일치해야 하기 때문이다. (작업 분장 3.10) 이 파일은 목 서버용이다.
 */

/** 마지막 글자에 받침이 있는지 */
export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) return false;

  const code = last.charCodeAt(0);
  // 한글 음절 영역이 아니면 받침 판정을 하지 않는다.
  if (code < 0xac00 || code > 0xd7a3) return false;

  return (code - 0xac00) % 28 !== 0;
}

/**
 * `{childName}` 자리와 뒤따르는 조사를 함께 교정한다.
 *
 * 지원 패턴:
 *   {childName}아  → 아 / 야
 *   {childName}이  → 이 / (생략)
 *   {childName}    → 그대로
 */
export function withChildName(template: string, childName: string): string {
  const name = childName.trim();
  if (!name) return template.replace(/\{childName\}(아|이)?/g, "");

  const batchim = hasFinalConsonant(name);

  return template.replace(/\{childName\}(아|이)?/g, (_, particle) => {
    if (particle === "아") return `${name}${batchim ? "아" : "야"}`;
    if (particle === "이") return batchim ? `${name}이` : name;
    return name;
  });
}

/**
 * 숫자 뒤에 붙는 `로` / `으로`를 고른다.
 *
 * 마지막 자리 숫자를 한글로 읽었을 때 받침이 없거나 ㄹ이면 `로`, 그 외는 `으로`다.
 *   장면 1로 · 2로 · 3으로 · 4로 · 6으로
 *
 * 아이가 읽는 화면이라 조사가 틀리면 바로 눈에 띈다.
 */
export function numberRo(value: number): string {
  // 0 영(ㅇ) 1 일(ㄹ) 2 이 3 삼(ㅁ) 4 사 5 오 6 육(ㄱ) 7 칠(ㄹ) 8 팔(ㄹ) 9 구
  const NEEDS_EU = [true, false, false, true, false, false, true, false, false, false];
  const lastDigit = Math.abs(Math.trunc(value)) % 10;
  return NEEDS_EU[lastDigit] ? "으로" : "로";
}

/**
 * 문장 단위로 자른다. 도입·전개 텍스트를 한 문장씩 순차 표시하는 데 쓴다.
 *
 * "긴 텍스트를 한 번에 표시하지 않는다. 인터뷰에서 나온 요구사항이다." (작업 분장 2.2)
 * 저학년 아동에게 긴 텍스트는 인지 부담이 된다. (PRD 5.3)
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
