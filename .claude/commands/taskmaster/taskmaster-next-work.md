# Task Master - 다음 작업 시작하기

현재 작업 가능한 다음 태스크를 찾아서 작업을 시작합니다. Task Master와 GitHub Issue를 모두 업데이트합니다.

## 작업 순서

1. Task Master에서 다음 작업 가능한 태스크 찾기
   ```bash
   task-master next
   ```

2. 태스크 상세 정보 확인
   ```bash
   task-master show <task-id>
   ```

3. 태스크 상태를 in-progress로 변경
   ```bash
   task-master set-status --id=<task-id> --status=in-progress
   ```

4. GitHub Issue 찾기 및 업데이트
   - Issue 제목에서 태스크 찾기
   - Issue에 작업 시작 코멘트 추가
   - 라벨을 'status:in-progress'로 변경
   - GitHub Project 보드에서 상태 업데이트

5. 구현 계획 수립
   - 태스크의 상세 요구사항 분석
   - 필요한 파일 및 디렉토리 구조 파악
   - 구현 단계별 계획 작성

6. 작업 환경 준비
   - 필요한 브랜치 생성 (선택적)
   - 관련 파일들 열기
   - 필요한 의존성 확인

## 사용 예시
```
/taskmaster-next-work
```

이 명령어는 자동으로:
- 다음 작업할 태스크를 찾습니다
- Task Master와 GitHub의 상태를 동기화합니다
- 작업을 시작할 준비를 완료합니다