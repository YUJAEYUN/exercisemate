'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe as FirestoreUnsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { getUser, createUser } from '@/lib/firestore';
import type { User, AuthContextType } from '@/types';
import { toast } from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import { APP_CONSTANTS, handleFirebaseError } from '@/lib/utils';

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
    let userDataUnsubscribe: FirestoreUnsubscribe | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          console.log('Firebase user logged in:', firebaseUser.uid);

          // Firebase 사용자가 있으면 Firestore에서 사용자 정보 가져오기
          let userData = null;

          try {
            userData = await getUser(firebaseUser.uid);
            console.log('Existing user data:', userData);
          } catch (getUserError) {
            console.warn('Failed to get user data:', getUserError);
          }

          if (!userData) {
            console.log('Creating new user data...');
            // 새 사용자인 경우 기본 정보로 생성
            const newUserData: Partial<User> = {
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              // character는 캐릭터 선택 페이지에서 설정
            };

            try {
              await createUser(firebaseUser.uid, newUserData);
              userData = await getUser(firebaseUser.uid);
              console.log('New user created:', userData);
            } catch (createUserError) {
              console.error('Failed to create user:', createUserError);
              // 사용자 생성에 실패해도 기본 정보로 진행
              userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                character: undefined, // 캐릭터 선택 페이지로 이동하도록
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              } as User;
            }
          }

          setUser(userData);

          // 사용자 데이터 실시간 리스너 설정 (최적화됨)
          if (userData) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            userDataUnsubscribe = onSnapshot(userDocRef, (doc) => {
              if (doc.exists()) {
                const updatedUserData = doc.data() as User;
                // 얕은 비교로 성능 개선
                setUser(prevUser => {
                  if (!prevUser) return updatedUserData;

                  // 주요 필드만 비교하여 성능 향상
                  const hasChanged =
                    prevUser.character !== updatedUserData.character ||
                    prevUser.groupId !== updatedUserData.groupId ||
                    prevUser.fcmToken !== updatedUserData.fcmToken ||
                    JSON.stringify(prevUser.notificationSettings) !== JSON.stringify(updatedUserData.notificationSettings);

                  return hasChanged ? updatedUserData : prevUser;
                });
              }
            }, (error) => {
              console.error('User data listener error:', error);
            });
          }
        } else {
          // 기존 리스너 정리
          if (userDataUnsubscribe) {
            userDataUnsubscribe();
            userDataUnsubscribe = null;
          }
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        // 권한 문제인 경우에도 기본 Firebase 사용자 정보는 유지
        if (firebaseUser) {
          console.warn('Using fallback user data due to error');
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            character: undefined, // 캐릭터 선택 페이지로 이동하도록
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          } as User);
          toast.error('사용자 데이터 접근에 문제가 있습니다. Firebase 설정을 확인해주세요.');
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userDataUnsubscribe) {
        userDataUnsubscribe();
      }
    };
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

  // 사용자 정보 수동 새로고침 함수
  const refreshUser = async () => {
    if (!auth.currentUser) return;

    try {
      // 데이터베이스 업데이트가 완료될 시간을 위한 약간의 딜레이
      await new Promise(resolve => setTimeout(resolve, APP_CONSTANTS.REFRESH_DELAY));

      const userData = await getUser(auth.currentUser.uid);
      if (userData) {
        setUser(userData);
        console.log('User data refreshed:', userData);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      const appError = handleFirebaseError(error);
      toast.error(appError.userMessage || '사용자 정보 새로고침에 실패했습니다.');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
