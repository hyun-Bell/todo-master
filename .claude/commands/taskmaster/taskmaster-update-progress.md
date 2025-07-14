# Task Master - 진행 상황 업데이트

작업 중인 태스크의 진행 상황을 Task Master와 GitHub에 업데이트합니다.

## 인자
- `$ARGUMENTS`: 업데이트할 태스크 ID (예: 13.1, 14.2)

## 작업 순서

1. 현재 태스크 상태 확인
   ```bash
   task-master show $ARGUMENTS
   ```

2. 구현 진행 상황 파악
   - 완료된 작업 목록화
   - 남은 작업 확인
   - 발견된 이슈나 블로커 정리

3. Task Master에 진행 상황 업데이트
   ```bash
   task-master update-subtask --id=$ARGUMENTS --prompt="진행 상황: [완료된 내용], 남은 작업: [할 일], 이슈: [발견된 문제]"
   ```

4. GitHub Issue에 진행 상황 코멘트 추가
   - 완료된 작업 체크리스트
   - 남은 작업 목록
   - 예상 완료 시간
   - 발견된 이슈나 도움이 필요한 부분

5. 필요시 추가 조치
   - 블로커가 있으면 상태를 'blocked'로 변경
   - 추가 서브태스크가 필요하면 생성
   - 종속성 문제가 있으면 업데이트

## 사용 예시
```
/taskmaster-update-progress 13.4
```

이 명령어는:
- 현재 작업의 진행 상황을 체계적으로 정리합니다
- Task Master와 GitHub 모두에 동일한 정보를 업데이트합니다
- 팀원들이 진행 상황을 쉽게 파악할 수 있도록 합니다