import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "@/lib/firebase";

export interface UserProfileData {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  interests?: string[];
  city?: string;
  country?: string;
  verified?: boolean;
  has_completed_onboarding?: boolean;
  followers_count?: number;
  following_count?: number;
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  profile: UserProfileData | null;
  loading: boolean;
  needsOnboarding: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, initialData?: { username?: string; displayName?: string }) => Promise<void>;
  completeOnboarding: (data: Partial<UserProfileData>) => Promise<void>;
  updateProfile: (data: Partial<UserProfileData>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  profile: null,
  loading: true,
  needsOnboarding: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  completeOnboarding: async () => {},
  updateProfile: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to load profile from Firestore
  const loadProfile = async (fbUser: FirebaseUser): Promise<UserProfileData | null> => {
    const profileRef = doc(db, "profiles", fbUser.uid);
    try {
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfileData;
        setProfile(data);
        return data;
      } else {
        // Create initial skeleton profile
        const initialProfile: UserProfileData = {
          user_id: fbUser.uid,
          username: fbUser.email?.split("@")[0] || `user_${fbUser.uid.slice(0, 6)}`,
          display_name: fbUser.displayName || fbUser.email?.split("@")[0] || "Ummah Member",
          avatar_url: fbUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${fbUser.uid}`,
          bio: "",
          interests: [],
          city: "",
          country: "",
          verified: false,
          has_completed_onboarding: false,
          followers_count: 0,
          following_count: 0,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        await setDoc(profileRef, initialProfile);
        setProfile(initialProfile);
        return initialProfile;
      }
    } catch (err) {
      console.error("Failed to fetch or create profile in Firestore:", err);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await loadProfile(fbUser);
        // Update last seen
        try {
          await updateDoc(doc(db, "profiles", fbUser.uid), {
            last_seen: new Date().toISOString(),
          });
        } catch {
          // ignore minor timestamp write failures
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (firebaseUser) {
      await loadProfile(firebaseUser);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        await loadProfile(res.user);
      }
    } catch (error) {
      console.error("Google sign in failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
      if (res.user) {
        await loadProfile(res.user);
      }
    } catch (error) {
      console.error("Email sign in failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    initialData?: { username?: string; displayName?: string }
  ) => {
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const user = res.user;
      if (initialData?.displayName) {
        await fbUpdateProfile(user, { displayName: initialData.displayName });
      }
      const profileRef = doc(db, "profiles", user.uid);
      const newProfile: UserProfileData = {
        user_id: user.uid,
        username: initialData?.username || email.split("@")[0],
        display_name: initialData?.displayName || email.split("@")[0],
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
        bio: "",
        interests: [],
        city: "",
        country: "",
        verified: false,
        has_completed_onboarding: false,
        followers_count: 0,
        following_count: 0,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      await setDoc(profileRef, newProfile);
      setProfile(newProfile);
    } catch (error) {
      console.error("Email sign up failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async (data: Partial<UserProfileData>) => {
    if (!firebaseUser) return;
    try {
      const profileRef = doc(db, "profiles", firebaseUser.uid);
      const updated: Partial<UserProfileData> = {
        ...data,
        has_completed_onboarding: true,
        updated_at: new Date().toISOString(),
      };
      await updateDoc(profileRef, updated);
      setProfile((prev) => (prev ? { ...prev, ...updated } : (updated as UserProfileData)));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${firebaseUser.uid}`);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfileData>) => {
    if (!firebaseUser) return;
    try {
      const profileRef = doc(db, "profiles", firebaseUser.uid);
      await updateDoc(profileRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });
      setProfile((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${firebaseUser.uid}`);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setFirebaseUser(null);
    setProfile(null);
  };

  const user: AppUser | null = firebaseUser
    ? {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: profile?.display_name || firebaseUser.displayName || profile?.username || "Ummah Member",
        photoURL: profile?.avatar_url || firebaseUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${firebaseUser.uid}`,
        emailVerified: firebaseUser.emailVerified,
      }
    : null;

  const needsOnboarding = !!(firebaseUser && profile && profile.has_completed_onboarding === false);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        profile,
        loading,
        needsOnboarding,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        completeOnboarding,
        updateProfile: updateUserProfile,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
