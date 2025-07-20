#!/bin/bash

# E2E 테스트 실행 스크립트
# 이 스크립트는 E2E 테스트를 안전하고 안정적으로 실행합니다.

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수들
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 헬프 함수
show_help() {
    echo "E2E 테스트 실행 스크립트"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --help, -h        도움말 표시"
    echo "  --setup-only      Docker 환경만 설정하고 종료"
    echo "  --no-cleanup      테스트 후 정리 작업 건너뛰기"
    echo "  --watch           감시 모드로 테스트 실행"
    echo "  --verbose         상세 로그 출력"
    echo "  --single TEST     특정 테스트 파일만 실행"
    echo ""
    echo "예시:"
    echo "  $0                      # 전체 E2E 테스트 실행"
    echo "  $0 --watch             # 감시 모드로 실행"
    echo "  $0 --single users      # users 테스트만 실행"
    echo "  $0 --setup-only        # 환경 설정만 수행"
}

# 기본 설정
SETUP_ONLY=false
NO_CLEANUP=false
WATCH_MODE=false
VERBOSE=false
SINGLE_TEST=""

# 인자 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --setup-only)
            SETUP_ONLY=true
            shift
            ;;
        --no-cleanup)
            NO_CLEANUP=true
            shift
            ;;
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --single)
            SINGLE_TEST="$2"
            shift 2
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            show_help
            exit 1
            ;;
    esac
done

# 필수 도구 확인
check_requirements() {
    log_info "필수 도구 확인 중..."
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose가 설치되어 있지 않습니다."
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm이 설치되어 있지 않습니다."
        exit 1
    fi
    
    if [[ ! -f ".env.test" ]]; then
        log_error ".env.test 파일이 없습니다."
        exit 1
    fi
    
    log_success "모든 필수 도구가 준비되었습니다."
}

# Docker 환경 시작
start_docker_environment() {
    log_info "Docker 테스트 환경 시작 중..."
    
    # 기존 컨테이너 정리
    docker-compose -f ../docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
    
    # 새 환경 시작
    if ! docker-compose -f ../docker-compose.test.yml up -d --wait; then
        log_error "Docker 환경 시작 실패"
        exit 1
    fi
    
    log_success "Docker 환경이 시작되었습니다."
}

# 데이터베이스 설정
setup_database() {
    log_info "데이터베이스 스키마 설정 중..."
    
    # Prisma 생성
    if ! pnpm prisma generate; then
        log_error "Prisma 클라이언트 생성 실패"
        exit 1
    fi
    
    # 스키마 푸시
    if ! npx dotenv -e .env.test -- pnpm prisma db push --skip-generate; then
        log_error "데이터베이스 스키마 설정 실패"
        exit 1
    fi
    
    log_success "데이터베이스가 준비되었습니다."
}

# 테스트 실행
run_tests() {
    log_info "E2E 테스트 실행 중..."
    
    local jest_args="--config ./test/jest-e2e.json --runInBand"
    
    if [[ "$WATCH_MODE" == "true" ]]; then
        jest_args="$jest_args --watch"
    else
        jest_args="$jest_args --forceExit"
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        jest_args="$jest_args --verbose"
    fi
    
    if [[ -n "$SINGLE_TEST" ]]; then
        jest_args="$jest_args --testNamePattern=$SINGLE_TEST"
    fi
    
    if npx dotenv -e .env.test -- jest $jest_args; then
        log_success "모든 테스트가 통과했습니다! 🎉"
        return 0
    else
        log_error "일부 테스트가 실패했습니다."
        return 1
    fi
}

# 정리 작업
cleanup() {
    if [[ "$NO_CLEANUP" == "true" ]]; then
        log_warning "정리 작업을 건너뜁니다."
        return
    fi
    
    log_info "테스트 환경 정리 중..."
    docker-compose -f ../docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
    log_success "정리 완료"
}

# 메인 실행 함수
main() {
    log_info "=== E2E 테스트 시작 ==="
    
    check_requirements
    start_docker_environment
    setup_database
    
    if [[ "$SETUP_ONLY" == "true" ]]; then
        log_success "환경 설정만 완료했습니다. 테스트를 실행하려면 --setup-only 옵션 없이 다시 실행하세요."
        exit 0
    fi
    
    # 트랩 설정 (스크립트 종료 시 정리)
    trap cleanup EXIT
    
    if run_tests; then
        log_success "=== E2E 테스트 완료 ==="
        exit 0
    else
        log_error "=== E2E 테스트 실패 ==="
        exit 1
    fi
}

# 스크립트 실행
main "$@"