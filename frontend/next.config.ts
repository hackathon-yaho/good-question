import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 빌드 출력 폴더를 환경변수로 뺀다.
   *
   * `next dev`와 `next build`는 기본값 `.next`를 **같이** 쓴다. 개발 서버를 띄운 채
   * 빌드를 돌리면 실행 중인 서버의 청크를 덮어써 화면이 깨진다. 검증 스위트가
   * 그 개발 서버로 도는 프로젝트라 특히 곤란하다.
   *
   * `GQ_DIST_DIR=.next-build npm run build`로 분리해서 돌린다. 값을 주지 않으면
   * 기본 동작(`.next`)이고, Vercel 배포도 그대로 간다.
   *
   * ⚠️ 분리해서 빌드하면 Next가 `tsconfig.json`의 `include`에 그 폴더의 타입 경로를
   *    **덧붙이고 파일 전체를 재포매팅한다.** 커밋 전에 `git checkout -- tsconfig.json`으로
   *    되돌린다. 기본값(`.next`)으로 돌릴 때는 일어나지 않는다.
   */
  distDir: process.env.GQ_DIST_DIR || ".next",
};

export default nextConfig;
