# Log Replayer MVP Plan

## 개요

이벤트 로그를 시간 순서대로 재생하며 상태 변화를 살펴 볼 수 있는 디버깅 도구입니다. 로그 파일을 업로드하면 타임라인 UI로 이벤트를 탐색하고, 각 시점의 상태 스냅샷을 확인할 수 있습니다.

## 목적

- 대량의 이벤트 로그에서 특정 시점의 시스템 상태를 빠르게 파악
- 시간 순서대로 이벤트를 재생하며 상태 변화 흐름을 시각적으로 추적
- 디버깅 관점에서 유용한 타임라인 탐색 도구 제공

## 핵심 기능

### 1. 로그 업로드 및 파싱
- JSON/JSONL 형식의 이벤트 로그 파일 업로드
- 이벤트 스키마 자동 감지 (timestamp, type, payload 등)
- 업로드된 로그를 SQLite에 저장

### 2. 타임라인 UI
- 시간 순서대로 정렬된 이벤트 목록
- 이벤트 타입별 색상/아이콘 구분
- 스크롤 기반 탐색 + 검색/필터

### 3. 이벤트 스텝 이동
- 이전/다음 이벤트 이동
- 특정 시간으로 점프
- 이벤트 타입 필터링

### 4. 상태 스냅샷
- 현재 시점까지 누적된 상태 계산
- JSON Tree 형태로 상태 표시
- 상태 변경 diff 하이라이트

### 5. 이벤트 상세 보기
- 선택한 이벤트의 raw 데이터
- 이전 상태와의 비교 (diff)
- 이벤트 메타데이터 (timestamp, sequence 등)

## 기술 스택

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 5
- **State Management**: Zustand (타임라인 상태, 현재 스텝)
- **Styling**: Plain CSS
- **UI Components**: Headless UI (선택)
- **Testing**: Vitest + React Testing Library

### Backend
- **Framework**: Express + TypeScript
- **Database**: SQLite (better-sqlite3)
- **File Upload**: multer
- **Testing**: Vitest + supertest

### 공통
- **Event Schema**: Zod (런타임 검증)
- **Diff**: fast-json-patch 또는 custom diff
- **Build**: tsc + esbuild

## 데이터 모델

### Event (이벤트)
```typescript
interface Event {
  id: string;           // UUID
  sequence: number;     // 순서 (1, 2, 3...)
  timestamp: string;    // ISO 8601
  type: string;         // 이벤트 타입 (user_action, system_event 등)
  payload: object;      // 이벤트 데이터
  metadata?: object;    // 추가 메타데이터
}
```

### LogSession (로그 세션)
```typescript
interface LogSession {
  id: string;
  name: string;
  createdAt: string;
  eventCount: number;
  timeRange: {
    start: string;
    end: string;
  };
  eventTypes: string[]; // 고유한 이벤트 타입 목록
}
```

### StateSnapshot (상태 스냅샷)
```typescript
interface StateSnapshot {
  sessionId: string;
  eventId: string;
  sequence: number;
  state: object;        // 누적된 상태
  diff: object | null;  // 이전과의 차이 (첫 이벤트는 null)
}
```

## UI/UX 흐름

### 화면 구성

```
+--------------------------------------------------+
|  Log Replayer                    [Upload] [List] |
+--------------------------------------------------+
|  +-----------------+  +------------------------+ |
|  | TIMELINE        |  | STATE SNAPSHOT         | |
|  |                 |  |                        | |
|  | ▶ Event 1       |  | {                      | |
|  |   Event 2       |  |   "user": {            | |
|  |   Event 3       |  |     "id": "u1",        | |
|  | → Event 4       |  |     "name": "Kim"      | |
|  |   Event 5       |  |   },                   | |
|  |                 |  |   "cart": {            | |
|  | [Filters]       |  |     "items": [...]     | |
|  | Type: [All ▼]   |  |   }                    | |
|  | Search: [____]  |  | }                      | |
|  +-----------------+  +------------------------+ |
|  +----------------------------------------------+ |
|  | CONTROLS                                     | |
|  | [|<] [<] [Play/Pause] [>] [>||] [Speed: 1x] | |
|  | Time: 2024-03-26 14:32:15 | Step: 45/234    | |
|  +----------------------------------------------+ |
|  +----------------------------------------------+ |
|  | EVENT DETAIL                                 | |
|  | Type: user_action | Time: 14:32:15           | |
|  | Payload: {...}                               | |
|  | Diff: +user.name changed                     | |
|  +----------------------------------------------+ |
+--------------------------------------------------+
```

### 주요 인터랙션

1. **로그 업로드**
   - 드래그 앤 드롭 또는 파일 선택
   - JSON/JSONL 자동 감지
   - 업로드 진행률 표시
   - 파싱 결과 미리보기 (처음 10개 이벤트)

2. **타임라인 탐색**
   - 스크롤로 이벤트 목록 탐색
   - 클릭으로 특정 이벤트 선택
   - 키보드 단축키 (← → Home End)

3. **재생 컨트롤**
   - Play: 자동으로 다음 이벤트 이동 (speed 조절)
   - Pause: 재생 중지
   - Step: 한 이벤트씩 이동
   - Jump: 특정 시간/시퀀스로 이동

4. **상태 확인**
   - 현재 스텝까지의 누적 상태 표시
   - JSON Tree 확장/축소
   - 변경된 필드 하이라이트

## API 설계

### POST /api/sessions
로그 파일 업로드 및 세션 생성
```json
Request: multipart/form-data (file)
Response: { id, name, eventCount, timeRange }
```

### GET /api/sessions/:id
세션 정보 조회
```json
Response: { id, name, createdAt, eventCount, timeRange, eventTypes }
```

### GET /api/sessions/:id/events
이벤트 목록 조회 (페이지네이션)
```
Query: ?cursor=&limit=50&type=&search=
Response: { events[], nextCursor, total }
```

### GET /api/sessions/:id/events/:sequence
특정 시퀀스 이벤트 조회
```json
Response: { id, sequence, timestamp, type, payload, metadata }
```

### GET /api/sessions/:id/snapshot/:sequence
특정 시퀀스까지의 상태 스냅샷
```json
Response: { sequence, state, diff, previousSequence }
```

### GET /api/sessions
세션 목록 조회
```json
Response: { sessions[], total }
```

## 구현 단계

### Phase 1: 기본 구조 (Day 1-2)
- [ ] 프로젝트 초기화 (Vite + React + Express)
- [ ] 데이터베이스 스키마 설계
- [ ] 기본 UI 레이아웃 (3-panel)
- [ ] 라우팅 설정

### Phase 2: 백엔드 핵심 (Day 3-4)
- [ ] 파일 업로드 API
- [ ] JSON/JSONL 파서
- [ ] 이벤트 CRUD API
- [ ] 상태 스냅샷 계산 로직

### Phase 3: 프론트엔드 핵심 (Day 5-6)
- [ ] 타임라인 컴포넌트
- [ ] 이벤트 목록 렌더링
- [ ] 상태 스냅샷 표시 (JSON Tree)
- [ ] 컨트롤 바 (Play/Pause/Step)

### Phase 4: 고급 기능 (Day 7-8)
- [ ] 필터링 (타입, 검색)
- [ ] 상태 diff 계산/표시
- [ ] 키보드 단축키
- [ ] 자동 재생 (speed 조절)

### Phase 5: 테스트 및 정리 (Day 9-10)
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] 빌드 검증
- [ ] 문서 정리

## 비기능 요구사항

### 성능
- 10,000개 이벤트 로그: 초기 로드 < 2초
- 스냅샷 계산: lazy loading + 캐싱
- UI 반응성: 60fps 스크롤

### 데이터 처리
- 파일 크기: 최대 50MB
- 이벤트 개수: 최소 100,000개 지원
- 메모리 효율: 스트리밍 파싱

### UX
- 진행률 표시 (업로드, 파싱)
- 에러 메시지 (잘못된 JSON 등)
- 키보드 단축키 제공
- 반응형 (최소 1280px)

## 상태 계산 전략

### Reduce 기반 누적 상태
```typescript
// 이벤트 타입별 reducer 정의
type StateReducer = (state: object, event: Event) => object;

const reducers: Record<string, StateReducer> = {
  'user:created': (state, event) => ({
    ...state,
    users: [...(state.users || []), event.payload]
  }),
  'user:updated': (state, event) => ({
    ...state,
    users: state.users?.map(u => 
      u.id === event.payload.id ? { ...u, ...event.payload } : u
    )
  }),
  // ...
};

// 시퀀스까지 상태 계산
function calculateSnapshot(events: Event[], targetSequence: number): object {
  return events
    .filter(e => e.sequence <= targetSequence)
    .reduce((state, event) => {
      const reducer = reducers[event.type];
      return reducer ? reducer(state, event) : state;
    }, {});
}
```

### 최적화
- 시퀄스 100단위로 체크포인트 저장
- 체크포인트부터 재계산
- 메모리 캐싱 (LRU)

## 이벤트 타입 커스터마이징

### 기본 제공 reducer
- `entity:created` — 엔티티 추가
- `entity:updated` — 엔티티 수정
- `entity:deleted` — 엔티티 삭제

### 커스텀 reducer 등록 (향후)
```typescript
// settings.json
{
  "reducers": {
    "custom:action": "./reducers/custom-action.js"
  }
}
```

## 테스트 전략

### 백엔드
- 이벤트 파싱 (다양한 JSON 형식)
- 상태 계산 (reducer 로직)
- API 엔드포인트
- 에러 처리 (잘못된 파일 등)

### 프론트엔드
- 타임라인 렌더링
- 컨트롤 상태 관리
- 스냅샷 표시
- 키보드 이벤트

### 통합
- 업로드 → 표시 흐름
- 재생 → 상태 변경
- 필터링 → 목록 업데이트

## 파일 구조

```
log-replayer/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Timeline.tsx
│   │   │   ├── EventList.tsx
│   │   │   ├── EventItem.tsx
│   │   │   ├── StateSnapshot.tsx
│   │   │   ├── JsonTree.tsx
│   │   │   ├── ControlBar.tsx
│   │   │   ├── EventDetail.tsx
│   │   │   └── UploadZone.tsx
│   │   ├── hooks/
│   │   │   ├── useTimeline.ts
│   │   │   ├── usePlayback.ts
│   │   │   └── useSnapshot.ts
│   │   ├── stores/
│   │   │   └── timelineStore.ts
│   │   ├── utils/
│   │   │   ├── diff.ts
│   │   │   └── formatters.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
├── server/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   └── migrations/
│   │   ├── routes/
│   │   │   ├── sessions.ts
│   │   │   └── events.ts
│   │   ├── services/
│   │   │   ├── logParser.ts
│   │   │   ├── snapshotCalculator.ts
│   │   │   └── reducers/
│   │   │       ├── index.ts
│   │   │       ├── entity.ts
│   │   │       └── custom.ts
│   │   └── index.ts
│   └── tests/
├── docs/
│   └── mvp-plan.md
└── package.json
```

## 향후 확장 아이디어

### 단기
- [ ] CSV 로그 지원
- [ ] 상태 내보내기 (JSON)
- [ ] 타임라인 줌 인/아웃
- [ ] 이벤트 검색 (全文)

### 중기
- [ ] 실시간 로그 스트리밍
- [ ] 여러 세션 비교
- [ ] 커스텀 reducer 설정 UI
- [ ] 상태 변화 그래프 시각화

### 장기
- [ ]团队协作 (share sessions)
- [ ] 고급 필터 (쿼리 언어)
- [ ] 성능 프로파일링
- [ ] 플러그인 시스템

## 참고 자료

- Redux DevTools: 시간여행 디버깅 개념
- Chrome DevTools Network: 타임라인 UI 레퍼런스
- JSON Crack: JSON 시각화 아이디어

## 결정 사항

1. **상태 계산 위치**: 서버에서 계산 → 클라이언트에 캐싱
   - 이유: 복잡한 reducer 로직, 여러 클라이언트 지원 가능

2. **파일 저장**: SQLite (로컬 파일)
   - 이유: 간단한 설치, zero-config, 워크스페이스 패턴 일관성

3. **UI 레이아웃**: 3-panel (타임라인 | 상태 | 디테일)
   - 이유: 정보 밀도 vs 가독성 균형

4. **빌드 도구**: Vite
   - 이유: 워크스페이스 표준, 빠른 HMR

## 체크리스트

### 완료 기준
- [ ] JSON/JSONL 로그 업로드 가능
- [ ] 1000개 이상 이벤트 타임라인 표시
- [ ] Step 이동으로 상태 변화 확인 가능
- [ ] Play로 자동 재생 가능
- [ ] 테스트 80% 이상 커버리지
- [ ] 빌드 및 실행 가능

---

**다음 작업**: Phase 1 시작 - 프로젝트 초기화
