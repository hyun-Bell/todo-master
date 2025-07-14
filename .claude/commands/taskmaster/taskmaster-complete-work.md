# Task Master - 작업 완료하기

현재 작업 중인 태스크를 완료 처리하고 Task Master와 GitHub를 동기화합니다.

## 인자
- `$ARGUMENTS`: 완료할 태스크 ID (예: 13.1, 14.2)

## 작업 순서

1. 태스크 상세 정보 확인
   ```bash
   task-master show $ARGUMENTS
   ```

2. 구현 완료 사항 검증
   - 코드 린트 실행: `pnpm lint`
   - 타입 체크 실행: `pnpm typecheck`
   - 테스트 실행 (있는 경우): `pnpm test`
   - 빌드 테스트: `pnpm run ios` 또는 `pnpm run android`

3. Task Master 업데이트
   - 구현 내용 요약을 subtask에 추가
   ```bash
   task-master update-subtask --id=$ARGUMENTS --prompt="구현 완료 내용..."
   ```
   - 상태를 done으로 변경
   ```bash
   task-master set-status --id=$ARGUMENTS --status=done
   ```

4. GitHub Issue 업데이트
   - 해당 태스크의 GitHub Issue 찾기
   - 완료 코멘트 추가 (구현 내용, 테스트 결과 포함)
   - 라벨을 'status:done'으로 변경
   - 관련 PR이 있다면 연결

5. GitHub Project 보드 업데이트
   - 프로젝트 보드에서 카드를 'Done' 컬럼으로 이동

6. 다음 작업 확인
   ```bash
   task-master next
   ```

## 사용 예시
```
/taskmaster-complete-work 13.1
```

이 명령어는 자동으로:
- 작업 완료 전 모든 검증을 수행합니다
- Task Master와 GitHub의 상태를 동기화합니다
- 다음 작업할 태스크를 제안합니다