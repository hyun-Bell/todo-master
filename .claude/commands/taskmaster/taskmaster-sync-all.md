# Task Master - 전체 동기화

Task Master의 모든 태스크 상태를 GitHub Issues 및 Project와 동기화합니다.

## 작업 순서

1. Task Master 전체 상태 확인
   ```bash
   task-master list
   ```

2. 각 태스크별로 GitHub Issue 매핑 확인
   - Task ID와 Issue 번호 매칭
   - 새로운 태스크는 Issue 생성
   - 기존 태스크는 Issue 업데이트

3. 상태 동기화
   - Task Master의 상태를 기준으로 GitHub 라벨 업데이트
   - pending → status:todo
   - in-progress → status:in progress  
   - done → status:done

4. GitHub Project 보드 업데이트
   - 각 Issue의 상태에 따라 Project 보드 컬럼 이동
   - Todo, In Progress, Done 컬럼에 맞게 배치

5. 진행률 리포트 생성
   - 전체 태스크 진행률
   - 우선순위별 진행 상황
   - 블로킹 이슈 목록
   - 다음 작업 가능한 태스크 목록

6. 동기화 결과 요약
   - 업데이트된 Issue 수
   - 새로 생성된 Issue 수
   - 동기화 실패한 항목 (있는 경우)

## 사용 예시
```
/taskmaster-sync-all
```

이 명령어는:
- Task Master와 GitHub을 완전히 동기화합니다
- 프로젝트의 전체 진행 상황을 한눈에 파악할 수 있게 합니다
- 정기적으로 실행하여 두 시스템 간 일관성을 유지합니다

## 주의사항
- 이 작업은 많은 API 호출을 수행하므로 시간이 걸릴 수 있습니다
- GitHub API rate limit에 주의하세요
- 중요한 변경사항이 있을 때는 수동으로 확인하는 것을 권장합니다