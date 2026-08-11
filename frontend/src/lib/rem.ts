/**
 * 설계 px → rem 변환
 *
 * docs/spec/screens.md는 크기를 px로 적어두었다(마이크 180px, 초상 96px 등).
 * 호출부에서 그 숫자를 그대로 쓰되 실제 스타일은 rem으로 나가게 한다.
 * 명세와 코드가 같은 숫자를 쓰면서 해상도에 따라 비례한다.
 *
 *   rem(180) → "11.25rem"
 */
const BASE = 16;

export function rem(designPx: number): string {
  return `${designPx / BASE}rem`;
}

/** 계산이 필요할 때(지름 × 배수 등) 쓰는 숫자 버전 */
export function remValue(designPx: number): number {
  return designPx / BASE;
}
