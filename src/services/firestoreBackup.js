/**
 * Firestore Daily Backup Service
 *
 * REQUIREMENTS — read before enabling:
 * This service uses the Cloud Firestore Admin API to export Firestore data to a
 * Google Cloud Storage (GCS) bucket. For this to work you must:
 *
 *   1. Create a GCS bucket in Google Cloud Console and set BACKUP_BUCKET_NAME
 *      to its name (e.g. "sree-pragathi-backups").
 *
 *   2. Grant the Firebase/App Engine default service account the
 *      "Storage Admin" role on that bucket:
 *      Cloud Console → IAM & Admin → IAM → find the service account that ends
 *      with @appspot.gserviceaccount.com → Add role: Storage Admin.
 *
 *   3. Enable the "Cloud Firestore API" and "Cloud Storage API" in Google Cloud
 *      Console → APIs & Services → Library if they are not already enabled.
 *
 *   4. If running outside of Google Cloud (e.g. Replit), set
 *      GOOGLE_APPLICATION_CREDENTIALS to the path of your service-account JSON
 *      key file, OR set FIREBASE_SERVICE_ACCOUNT_JSON to the key JSON string.
 *      The firebase-admin initialisation in server.js must use those credentials.
 *
 * If a backup fails with a PERMISSION_DENIED error, re-check steps 2–4 above.
 */

const { v1 } = require('@google-cloud/firestore');
const admin = require('firebase-admin');

const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID || 'school_001';

async function runDailyBackup() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const bucketName = process.env.BACKUP_BUCKET_NAME;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is not set');
  }
  if (!bucketName) {
    throw new Error('BACKUP_BUCKET_NAME environment variable is not set');
  }

  const today = new Date().toISOString().slice(0, 10);
  const outputUriPrefix = `gs://${bucketName}/backups/${today}/sree-pragathi-backup`;

  const client = new v1.FirestoreAdminClient();
  const databaseName = client.databasePath(projectId, '(default)');

  try {
    const [operation] = await client.exportDocuments({
      name: databaseName,
      outputUriPrefix,
      collectionIds: [],
    });

    console.log(`[Backup] Daily backup completed: ${outputUriPrefix}`);

    const db = admin.firestore();
    await db.collection('backup_logs').add({
      status: 'success',
      path: outputUriPrefix,
      operationName: operation.name || '',
      timestamp: new Date().toISOString(),
      schoolId: DEFAULT_SCHOOL_ID,
    });
  } catch (err) {
    console.error('[Backup] Daily backup failed:', err.message);

    const db = admin.firestore();
    try {
      await db.collection('admin_notifications').add({
        type: 'backup_failed',
        message: `Daily Firestore backup failed — ${err.message}`,
        priority: 'high',
        read: false,
        createdAt: new Date().toISOString(),
        schoolId: DEFAULT_SCHOOL_ID,
      });
    } catch (notifErr) {
      console.error('[Backup] Failed to write failure notification:', notifErr.message);
    }

    throw err;
  }
}

module.exports = { runDailyBackup };
