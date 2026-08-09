# 문서 (docs)

`good-question` 프로젝트의 모든 문서를 보관하는 폴더입니다.

## 구조

```
docs/
└── request/          # 파트별 요구사항 문서
    ├── ai/           # AI 파트에 요청하는 요구사항
    ├── backend/      # 백엔드 파트에 요청하는 요구사항
    └── frontend/     # 프론트엔드 파트에 요청하는 요구사항
```

## 작성 규칙

- 문서는 **마크다운(`.md`)** 으로 작성합니다.
- 파일명은 소문자 + 하이픈(kebab-case)을 사용합니다. (예: `question-generate-api.md`)
- 한 문서는 하나의 주제만 다룹니다. 내용이 길어지면 문서를 분리하세요.
- 이미지·다이어그램은 문서와 같은 폴더의 `assets/` 하위에 둡니다.
- 결정이 바뀌면 문서를 **수정**하고, 변경 이력은 커밋 메시지로 남깁니다.

## 폴더별 안내

| 폴더 | 설명 |
| --- | --- |
| [request/](request/) | 파트 간 요청 사항과 요구사항 정의서 |
| [request/ai/](request/ai/) | 모델·프롬프트·데이터 관련 요구사항 |
| [request/backend/](request/backend/) | API·데이터 모델·인프라 관련 요구사항 |
| [request/frontend/](request/frontend/) | 화면·컴포넌트·연동 관련 요구사항 |
