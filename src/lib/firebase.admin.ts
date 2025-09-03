// lib/firebase.admin.ts
import 'server-only';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: applicationDefault() });

export const adminDb = getFirestore(adminApp);
