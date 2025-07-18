# Task Master - 스마트 커밋 생성

Task Master의 태스크를 기준으로 작업 단위별 커밋을 자동으로 생성합니다.

## 작업 순서

1. 현재 변경 사항 분석
   ```bash
   git status
   git diff --staged
   git diff
   ```

2. Task Master에서 현재 작업 중인 태스크 확인
   - in-progress 상태인 태스크 찾기
   - 최근 업데이트된 태스크 확인

3. 변경 파일과 태스크 매핑
   - 변경된 파일의 내용과 위치 분석
   - 관련된 Task Master 태스크 식별
   - 작업 단위로 파일 그룹화

4. 커밋 단위 결정
   - 동일한 태스크/서브태스크 관련 파일끼리 그룹화
   - 논리적으로 연관된 변경사항끼리 묶기
   - 너무 큰 커밋은 분할, 너무 작은 커밋은 병합

5. 각 커밋별로 수행
   - 관련 파일만 스테이징
   ```bash
   git add [관련 파일들]
   ```
   
   - 커밋 메시지 생성 규칙:
     - **Task Master 태스크가 있는 경우**: `[TASK:task번호] type: 한글 설명`
     - **Task Master 태스크가 없는 경우**: `type: 한글 설명`
     - **GitHub Issue가 있는 경우**: 설명 뒤에 `(#이슈번호)` 추가
   
   - 커밋 타입:
     - feat: 새로운 기능 추가
     - fix: 버그 수정
     - docs: 문서 수정
     - style: 코드 포맷팅, 세미콜론 누락 등
     - refactor: 코드 리팩토링
     - test: 테스트 추가/수정
     - chore: 빌드 업무, 패키지 매니저 수정 등
   
   - 커밋 실행
   ```bash
   # Task Master 태스크가 있는 경우
   git commit -m "[TASK:task번호] type: 설명"
   
   # Task Master 태스크가 없는 경우
   git commit -m "type: 설명"
   ```

6. 커밋 예시
   - `[TASK:15] feat: NestJS JWT 기반 인증 시스템 구현`
   - `[TASK:14-6] feat: WebSocket 실시간 통신 시스템 구현`
   - `test: E2E 테스트 환경 구성 및 테스트 코드 추가`
   - `docs: 프로젝트 문서 및 개발 환경 설정 추가`
   - `chore: TaskMaster 커밋 형식 개선 및 태스크 업데이트`

7. 커밋 검증
   - 각 커밋이 독립적으로 빌드 가능한지 확인
   - 커밋 메시지가 명확하고 이해하기 쉬운지 검토
   - Task Master 태스크가 있는 경우 올바른 태스크 번호인지 확인
   - GitHub Issue 번호를 추가하는 경우 실제 존재하는 이슈인지 확인

8. 결과 보고
   - 생성된 커밋 목록
   - 각 커밋에 포함된 파일
   - 연결된 Task Master 태스크

## 사용 예시
```
/taskmaster-smart-commit
```

이 명령어는:
- 현재 변경사항을 Task Master 태스크와 연결합니다
- 작업 단위별로 논리적인 커밋을 생성합니다
- 일관된 커밋 메시지 형식을 유지합니다
- GitHub Issue와 자동으로 연결됩니다

## 옵션
- 특정 태스크만 커밋하려면: `/taskmaster-smart-commit 13.1`
- 모든 변경사항을 하나로: `/taskmaster-smart-commit --single`

## 주의사항
- 커밋 전에 항상 변경사항을 검토하세요
- 민감한 정보가 포함되지 않았는지 확인하세요
- 큰 바이너리 파일이나 생성된 파일은 제외됩니다 (예: coverage/, node_modules/)
- Task Master 태스크 번호는 실제 존재하는 태스크여야 합니다
- GitHub Issue 번호는 선택사항이며, 실제 이슈가 있을 때만 추가합니다