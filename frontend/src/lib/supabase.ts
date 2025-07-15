import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import type { Database } from '../types/database';

// Supabase 클라이언트 생성 (타입 정의 포함)
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// 연결 테스트 함수
export const testSupabaseConnection = async () => {
  try {
    // 실제 테이블로 연결 테스트 (users 테이블)
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.warn('Supabase connection test failed:', error.message);
      return false;
    }
    console.log('Supabase connected successfully');
    return true;
  } catch (err) {
    console.error('Supabase connection error:', err);
    return false;
  }
};

// 데이터베이스 스키마 확인 함수
export const checkDatabaseSchema = async () => {
  try {
    const tables = ['users', 'goals', 'plans', 'checkpoints', 'notifications'];
    const results = [];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      results.push({
        table,
        exists: !error,
        error: error?.message || null
      });
    }
    
    return results;
  } catch (err) {
    console.error('Database schema check error:', err);
    return [];
  }
};

// RLS 정책 테스트 함수
export const testRLSPolicies = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        message: '사용자가 인증되지 않았습니다.'
      };
    }

    const tests = [];

    // 1. 본인 프로필 조회 테스트
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id);
      
      tests.push({
        name: '본인 프로필 조회',
        success: !error,
        error: error?.message
      });
    } catch (err) {
      tests.push({
        name: '본인 프로필 조회',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // 2. 본인 목표 조회 테스트
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);
      
      tests.push({
        name: '본인 목표 조회',
        success: !error,
        error: error?.message
      });
    } catch (err) {
      tests.push({
        name: '본인 목표 조회',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // 3. 목표 생성 테스트
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: 'RLS 테스트 목표',
          description: '이것은 RLS 정책 테스트용 목표입니다.',
          category: 'test'
        })
        .select();
      
      tests.push({
        name: '목표 생성',
        success: !error,
        error: error?.message
      });

      // 생성된 테스트 목표 삭제
      if (data && data.length > 0) {
        await supabase
          .from('goals')
          .delete()
          .eq('id', data[0].id);
      }
    } catch (err) {
      tests.push({
        name: '목표 생성',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    return {
      success: true,
      tests,
      message: 'RLS 정책 테스트 완료'
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error',
      tests: []
    };
  }
};