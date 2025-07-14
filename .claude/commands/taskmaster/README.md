# Task Master Claude Code Commands

Task Master와 GitHub를 효과적으로 연동하기 위한 Claude Code slash commands 모음입니다.

## 사용 가능한 명령어

### 1. `/taskmaster-next-work`
다음 작업할 태스크를 찾아서 작업을 시작합니다.
- Task Master에서 다음 가능한 태스크 확인
- 상태를 in-progress로 변경
- GitHub Issue 업데이트
- 작업 환경 준비

### 2. `/taskmaster-complete-work <task-id>`
작업을 완료하고 모든 시스템을 업데이트합니다.
```
/taskmaster-complete-work 13.1
```
- 코드 검증 (lint, typecheck, test)
- Task Master 상태를 done으로 변경
- GitHub Issue 완료 처리
- 다음 작업 제안

### 3. `/taskmaster-update-progress <task-id>`
진행 중인 작업의 상태를 업데이트합니다.
```
/taskmaster-update-progress 13.4
```
- 진행 상황 정리
- Task Master에 업데이트 기록
- GitHub Issue에 진행 상황 코멘트 추가

### 4. `/taskmaster-sync-all`
Task Master와 GitHub을 전체 동기화합니다.
- 모든 태스크 상태 동기화
- GitHub Project 보드 업데이트
- 진행률 리포트 생성

### 5. `/taskmaster-auto-implement <task-id>`
AI를 활용하여 태스크를 자동으로 구현합니다.
```
/taskmaster-auto-implement 13.5
```
- 태스크 요구사항 분석
- 구현 계획 수립
- 코드 자동 생성
- 테스트 및 검증

### 6. `/taskmaster-sync-to-github`
Task Master의 현재 상태를 GitHub에 완전히 동기화합니다.
- Task Master를 기준으로 GitHub Issues 업데이트
- 상태, 우선순위, 진행률 모두 동기화
- GitHub Project 보드 자동 정리

### 7. `/taskmaster-smart-commit`
Task Master 태스크 기준으로 스마트 커밋을 생성합니다.
- 변경사항을 작업 단위로 자동 그룹화
- 일관된 커밋 메시지 형식 (type: 한글 설명 (#이슈번호))
- 논리적인 커밋 단위 생성

## 워크플로우 예시

### 일일 개발 워크플로우
1. `/taskmaster-next-work` - 오늘 작업할 태스크 시작
2. 개발 진행...
3. `/taskmaster-update-progress <id>` - 중간 진행 상황 업데이트
4. `/taskmaster-complete-work <id>` - 작업 완료
5. `/taskmaster-next-work` - 다음 작업 시작

### 주간 동기화
매주 월요일에 `/taskmaster-sync-all`로 전체 상태 동기화

## 설정 방법

이 명령어들은 Claude Code에서 자동으로 인식됩니다. 
`.claude/commands/taskmaster/` 디렉토리에 있는 모든 `.md` 파일이 slash command로 등록됩니다.

## 커스터마이징

각 명령어 파일을 수정하여 프로젝트에 맞게 커스터마이징할 수 있습니다.
- 추가 검증 단계 추가
- 프로젝트별 특수 요구사항 반영
- 팀 워크플로우에 맞게 조정