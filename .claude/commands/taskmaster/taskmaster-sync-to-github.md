# Task Master - GitHub 상태 동기화

Task Master의 현재 상태를 기준으로 GitHub Issues와 Project를 완전히 동기화합니다.

## 작업 순서

1. Task Master 현재 상태 읽기
   ```bash
   task-master list
   ```

2. GitHub Issues와 매핑 확인
   - 각 태스크의 제목으로 GitHub Issue 검색
   - Issue가 없으면 새로 생성
   - Issue가 있으면 업데이트

3. 각 태스크별 상태 동기화
   - Task Master 상태 → GitHub 라벨 매핑
     - `pending` → `status:todo`
     - `in-progress` → `status:in progress`
     - `done` → `status:done`
     - `blocked` → `status:blocked`
     - `deferred` → `status:deferred`
   
4. Issue 본문 업데이트
   - Task Master의 최신 details 정보 반영
   - 서브태스크 진행 상황 업데이트
   - 구현 노트 및 업데이트 내역 추가

5. GitHub Project 보드 상태 업데이트
   - 각 Issue를 Task Master 상태에 맞는 컬럼으로 이동
   - Todo, In Progress, Done 컬럼 자동 배치

6. 우선순위 라벨 동기화
   - `high` → `priority:high`
   - `medium` → `priority:medium`
   - `low` → `priority:low`

7. 서브태스크 상태 반영
   - 메인 태스크 Issue에 서브태스크 진행률 코멘트 추가
   - 완료된 서브태스크 체크리스트 업데이트

8. 동기화 결과 보고
   - 업데이트된 Issue 목록
   - 새로 생성된 Issue 목록
   - Project 보드 변경 사항
   - 동기화 실패 항목 (있는 경우)

## 사용 예시
```
/taskmaster-sync-to-github
```

이 명령어는:
- Task Master를 "신뢰할 수 있는 단일 정보원"으로 사용합니다
- GitHub을 Task Master 상태에 맞춰 완전히 업데이트합니다
- 프로젝트 진행 상황을 GitHub에서도 정확히 추적할 수 있게 합니다

## 주의사항
- 이 작업은 GitHub의 현재 상태를 덮어씁니다
- Task Master의 데이터가 최신인지 먼저 확인하세요
- 대량의 API 호출이 발생할 수 있습니다
- 이미 github issues에서 closed 된 이슈는 다시 생성하지 않도록 주의하세요.