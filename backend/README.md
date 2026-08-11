# good-question backend

굿퀘스천 MVP 백엔드. Spring Boot 3.4.5 / Java 21 / Gradle / PostgreSQL

작업 항목·플랜·결정 근거는 [docs/](docs/)를 참조하세요. 프로젝트 전체 맥락(정본)은 [../docs/](../docs/)에 있습니다.

## 시작하기

```bash
cp .env.example .env        # 값 채우기
docker-compose up -d        # 로컬 Postgres 기동
./gradlew bootRun           # 앱 실행 (http://localhost:8080/api)
```

## 커맨드

```bash
./gradlew clean build   # 빌드
./gradlew bootRun       # 실행
./gradlew test          # 테스트 (docker-compose up -d 먼저 필요)
```

## 문서

| 문서 | 내용 |
| --- | --- |
| [docs/README.md](docs/README.md) | 진입점. 값은 어디서 찾는지 매핑표 |
| [docs/work-items.md](docs/work-items.md) | 작업 항목 전체 |
| [docs/plan.md](docs/plan.md) | Phase 1~7 진행 순서 |
| [docs/decisions.md](docs/decisions.md) | 확정 결정 + 근거 |
| [docs/setup.md](docs/setup.md) | 스택 · 환경변수 · 배포 |
