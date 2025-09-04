import 'server-only';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const admin = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: applicationDefault() });

export const adminAuth = getAuth(admin);
export const adminDb = getFirestore(admin);
