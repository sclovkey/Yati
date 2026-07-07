import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { LogEntry, InternshipInfo, NotificationSettings as SettingsType, AttendanceRecord, OfficeLocation } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfile {
  username: string;
  password?: string;
  studentName: string;
  institution: string;
  companyName: string;
  position: string;
  mentorName: string;
}

export interface UserDataPayload {
  logs: LogEntry[];
  info: InternshipInfo;
  notifSettings: SettingsType;
  attendance: AttendanceRecord[];
  officeLoc: OfficeLocation;
}

// Check if a user exists and fetch their details
export async function getFirestoreUser(username: string): Promise<UserProfile | null> {
  const usernameKey = username.toLowerCase().trim();
  const path = `users/${usernameKey}`;
  try {
    const userDocRef = doc(db, 'users', usernameKey);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Create/Register a new user
export async function createFirestoreUser(profile: UserProfile): Promise<boolean> {
  const usernameKey = profile.username.toLowerCase().trim();
  const path = `users/${usernameKey}`;
  try {
    const userDocRef = doc(db, 'users', usernameKey);
    await setDoc(userDocRef, {
      ...profile,
      username: usernameKey,
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch all app data for a specific user
export async function getFirestoreUserData(username: string): Promise<UserDataPayload | null> {
  const usernameKey = username.toLowerCase().trim();
  const path = `userData/${usernameKey}`;
  try {
    const dataDocRef = doc(db, 'userData', usernameKey);
    const dataSnap = await getDoc(dataDocRef);
    if (dataSnap.exists()) {
      return dataSnap.data() as UserDataPayload;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Save/Update app data for a specific user
export async function saveFirestoreUserData(username: string, data: UserDataPayload): Promise<boolean> {
  const usernameKey = username.toLowerCase().trim();
  const path = `userData/${usernameKey}`;
  try {
    const dataDocRef = doc(db, 'userData', usernameKey);
    await setDoc(dataDocRef, {
      ...data,
      lastUpdated: new Date().toISOString()
    });
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch {
      return false;
    }
  }
}
