# Log Replayer

이벤트 로그를 재생하고, 분석하며, 디버깅할 수 있는 웹 애플리케이션입니다. 타임라인 시각화와 상태 스냅샷 기능을 제공합니다.

## 기능

- **JSON 로그 업로드**: 이벤트 데이터가 포함된 JSON 로그 파일 업로드 및 파싱
- **타임라인 시각화**: 시각적 타임라인으로 이벤트 탐색
- **상태 스냅샷**: 특정 시점의 애플리케이션 상태 조회
- **이벤트 필터링**: 이벤트 유형, 시간 범위, 검색어로 필터링
- **재생 컨트롤**: 재생, 일시정지, 재생 속도 조절
- **반응형 디자인**: 데스크톱과 모바일 모두 지원

## 기술 스택

### 프론트엔드
- React 19 + TypeScript
- Zustand (상태 관리)
- React Router (라우팅)
- Vite (빌드 도구)

### 백엔드
- Express.js + TypeScript
- SQLite (데이터 저장)
- Multer (파일 업로드)
- Zod (유효성 검사)

## 프로젝트 구조

```
log-replayer/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── api/           # API 클라이언트 함수
│   │   ├── components/    # React 컴포넌트
│   │   ├── stores/        # Zustand 스토어
│   │   ├── types/         # TypeScript 타입
│   │   └── test/          # 테스트 설정
│   └── package.json
├── server/                 # Express 백엔드
│   ├── src/
│   │   ├── db/            # 데이터베이스 유틸리티
│   │   │   ├── repositories/  # 데이터 접근 계층
│   │   │   └── schema.ts  # 데이터베이스 스키마
│   │   ├── routes/        # API 라우트
│   │   ├── services/      # 비즈니스 로직
│   │   │   ├── logParser.ts
│   │   │   ├── snapshotCalculator.ts
│   │   │   └── reducers/
│   │   └── index.ts       # 서버 진입점
│   └── tests/
│       └── integration/   # 통합 테스트
├── scripts/               # 빌드 및 유틸리티 스크립트
├── docs/                  # 문서
└── package.json           # 루트 패키지 설정
```

## 설치

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn

### 설정

1. 저장소 클론:
   ```bash
   git clone <repository-url>
   cd log-replayer
   ```

2. 의존성 설치:
   ```bash
   npm install
   ```

3. 개발 서버 시작:
   ```bash
   npm run dev
   ```

   이 명령은 프론트엔드(Vite)와 백엔드(Express) 서버를 모두 시작합니다.

4. 브라우저에서 `http://localhost:5173` 열기

## 개발

### 사용 가능한 스크립트

| 명령어 | 설명 |
|---------|-------------|
| `npm run dev` | 클라이언트와 서버를 개발 모드로 시작 |
| `npm run dev:client` | 프론트엔드 개발 서버만 시작 |
| `npm run dev:server` | 백엔드 개발 서버만 시작 |
| `npm run build` | 프로덕션용 빌드 |
| `npm run preview` | 프로덕션 빌드 미리보기 |
| `npm test` | 모든 테스트 실행 |
| `npm run test:watch` | 테스트를 watch 모드로 실행 |
| `npm run benchmark` | 성능 벤치마크 실행 |

### 환경 변수

개발 환경에서는 환경 변수가 필요하지 않습니다. 애플리케이션은 SQLite를 로컬 저장소로 사용합니다.

## 로그 파일 형식

애플리케이션은 다음 구조의 JSON 로그 파일을 기대합니다:

```json
{
  "session_name": "내 세션",
  "events": [
    {
      "timestamp": "2024-01-01T10:00:00Z",
      "type": "ENTITY_CREATED",
      "payload": {
        "entityType": "user",
        "entity": { "id": "1", "name": "Alice" }
      },
      "metadata": {
        "source": "api"
      }
    }
  ]
}
```

### 지원되는 이벤트 유형

| 이벤트 유형 | 설명 |
|------------|-------------|
| `ENTITY_CREATED` | 새 엔티티 생성 |
| `ENTITY_UPDATED` | 엔티티 수정 |
| `ENTITY_DELETED` | 엔티티 삭제 |
| `ENTITIES_CLEARED` | 다중 엔티티 제거 |

## 테스트

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 테스트를 watch 모드로 실행
npm run test:watch

# 커버리지와 함께 실행
npm test -- --coverage
```

### 테스트 커버리지

프로젝트는 80% 이상의 테스트 커버리지를 목표로 합니다. 커버리지 리포트는 `coverage/` 디렉토리에 생성됩니다.

### 테스트 작성

테스트는 Vitest를 사용하며 다음 규칙을 따릅니다:

```typescript
import { describe, expect, it } from 'vitest';

describe('기능 이름', () => {
  it('무언가를 해야 함', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## API 문서

### 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|----------|-------------|
| GET | `/health` | 헬스 체크 |
| GET | `/api/sessions` | 모든 세션 목록 |
| POST | `/api/sessions/upload` | 로그 파일 업로드 |
| GET | `/api/sessions/:id` | 세션 상세 정보 |
| DELETE | `/api/sessions/:id` | 세션 삭제 |
| GET | `/api/sessions/:id/events` | 세션 이벤트 조회 |
| GET | `/api/sessions/:id/event-types` | 고유 이벤트 유형 조회 |

자세한 API 문서는 [docs/api.md](docs/api.md)를 참조하세요.

## 성능 벤치마크

프로젝트는 대용량 데이터셋에서도 원활한 작동을 보장하기 위한 성능 벤치마크를 포함합니다:

- **이벤트 로딩**: 10,000개 이벤트를 2초 이내에 로드
- **스냅샷 계산**: 500개 작업에 대해 100ms 이내
- **상태 직렬화**: 1,000개 엔티티에 대해 100ms 이내

벤치마크 실행:
```bash
npm run benchmark
```

## 배포

### 프로덕션용 빌드

```bash
npm run build
```

이 명령은 다음에 최적화된 빌드를 생성합니다:
- `dist/client/` - 프론트엔드 자산
- (서버는 TypeScript와 함께 인라인 빌드)

### 프로덕션 서버

프로덕션 환경에서는 PM2와 같은 프로세스 관리자 사용:

```bash
npm install -g pm2
pm2 start server/src/index.ts --name log-replayer
```

## 기여

1. 저장소 포크
2. 기능 브랜치 생성
3. 변경사항 적용
4. 테스트 실행: `npm test`
5. 풀 리퀘스트 제출

## 라이선스

MIT 라이선스 - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

## 문제 해결

### 데이터베이스 문제

데이터베이스 오류가 발생하면 SQLite 파일을 삭제하고 재시작:
```bash
rm log-replayer.sqlite
npm run dev
```

### 포트 충돌

포트 5173 또는 3001이 사용 중인 경우:
- 프론트엔드: `vite.config.ts`에서 포트 변경
- 백엔드: `server/src/index.ts`에서 포트 변경
