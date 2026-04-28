import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { join } from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      let serviceAccount: admin.ServiceAccount;

      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Render / production: env var-аас JSON уншина
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else {
        // Local dev: файлаас уншина
        const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        serviceAccount = require(serviceAccountPath);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error('Invalid Firebase Token');
    }
  }
}
