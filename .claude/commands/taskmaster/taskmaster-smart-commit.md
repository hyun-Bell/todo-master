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
   
   - 커밋 메시지 생성 (형식: `type: 한글 설명 (#issue번호)`)
     - feat: 새로운 기능 추가
     - fix: 버그 수정
     - docs: 문서 수정
     - style: 코드 포맷팅, 세미콜론 누락 등
     - refactor: 코드 리팩토링
     - test: 테스트 추가/수정
     - chore: 빌드 업무, 패키지 매니저 수정 등
   
   - 커밋 실행
   ```bash
   git commit -m "type: 설명 (#이슈번호)"
   ```

6. 커밋 예시
   - `feat: React Native 프로젝트 초기화 및 TypeScript 설정 (#1)`
   - `chore: ESLint 및 Prettier 설정 추가 (#1)`
   - `feat: 프로젝트 폴더 구조 및 경로 별칭 설정 (#1)`
   - `chore: 필수 의존성 설치 및 Metro 번들러 최적화 (#1)`
   - `feat: 환경 변수 설정 및 개발 도구 구성 (#1)`

7. 커밋 검증
   - 각 커밋이 독립적으로 빌드 가능한지 확인
   - 커밋 메시지가 명확하고 이해하기 쉬운지 검토

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
- 큰 바이너리 파일이나 생성된 파일은 제외됩니다