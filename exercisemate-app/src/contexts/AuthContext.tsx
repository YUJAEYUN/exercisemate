'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUser, createUser } from '@/lib/firestore';
import type { User, AuthContextType } from '@/types';
import { toast } from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // Firebase 사용자가 있으면 Firestore에서 사용자 정보 가져오기
          let userData = await getUser(firebaseUser.uid);
          
          if (!userData) {
            // 새 사용자인 경우 기본 정보로 생성
            const newUserData: Partial<User> = {
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              // character는 캐릭터 선택 페이지에서 설정
            };
            
            await createUser(firebaseUser.uid, newUserData);
            userData = await getUser(firebaseUser.uid);
          }
          
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        toast.error('사용자 정보를 불러오는데 실패했습니다.');
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      await signInWithPopup(auth, provider);

      // 사용자 정보는 onAuthStateChanged에서 처리됨
      toast.success('로그인 성공!');
    } catch (error: unknown) {
      console.error('Google sign in error:', error);
      
      // 에러 메시지 처리
      let errorMessage = '로그인에 실패했습니다.';

      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/popup-closed-by-user') {
          errorMessage = '로그인이 취소되었습니다.';
        } else if (firebaseError.code === 'auth/popup-blocked') {
          errorMessage = '팝업이 차단되었습니다. 팝업을 허용해주세요.';
        } else if (firebaseError.code === 'auth/cancelled-popup-request') {
          errorMessage = '로그인 요청이 취소되었습니다.';
        } else if (firebaseError.code === 'auth/network-request-failed') {
          errorMessage = '네트워크 연결을 확인해주세요.';
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      setUser(null);
      toast.success('로그아웃되었습니다.');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('로그아웃에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
