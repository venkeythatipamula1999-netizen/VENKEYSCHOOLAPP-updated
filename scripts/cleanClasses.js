/**
 * One-time cleanup script for schools/{schoolId}/classes collection.
 * Run with: node scripts/cleanClasses.js
 *
 * Reads the SCHOOL_ID from env, or falls back to 'school_001'.
 * Set SCHOOL_ID=your-id before running if needed:
 *   SCHOOL_ID=sp_gopa_001 node scripts/cleanClasses.js
 */

require('dotenv').config();
const admin = require('firebase-admin');

// ── Firebase init ──────────────────────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

// ── Config ─────────────────────────────────────────────────────────────────────
const SCHOOL_ID = process.env.SCHOOL_ID || 'school_001';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns true if the name is the "canonical" format: <number>-<Letter>
 * e.g.  "10-A", "6-B", "1-A"
 */
function isCanonical(name) {
  return /^\d+-[A-Z]$/i.test(name.trim());
}

/**
 * Normalise a class name to a comparable key so we can detect duplicates.
 * "Grade 10-A" → "10A"
 * "10-B"       → "10B"
 * "10B"        → "10B"
 * "2-a"        → "2A"
 */
function normalise(name) {
  return name
    .trim()
    .replace(/^Grade\s*/i, '')   // strip leading "Grade "
    .replace(/-/g, '')            // strip dashes
    .toUpperCase();
}

/**
 * Returns true for single-letter garbage entries like "Y", "A", "B".
 */
function isGarbage(name) {
  return /^[A-Z]$/i.test(name.trim());
}

/**
 * Returns true for entries that start with "Grade " (case-insensitive).
 */
function startsWithGrade(name) {
  return /^Grade\s/i.test(name.trim());
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== Vidhaya Layam — Class Cleanup ===`);
  console.log(`School ID : ${SCHOOL_ID}`);
  console.log(`Collection: classes (filtered by schoolId == ${SCHOOL_ID})\n`);

  const colRef = db.collection('classes');
  const snap = await colRef.where('schoolId', '==', SCHOOL_ID).get();

  if (snap.empty) {
    console.log('No documents found. Nothing to do.');
    process.exit(0);
  }

  // ── 1. Print all found entries ───────────────────────────────────────────────
  console.log(`Found ${snap.size} document(s):\n`);
  const docs = [];
  snap.forEach(doc => {
    const data = doc.data();
    const name = (data.className || data.name || doc.id || '').trim();
    console.log(`  [${doc.id}]  className="${name}"`);
    docs.push({ id: doc.id, ref: doc.ref, name, data });
  });
  console.log();

  // ── 2. Identify what to delete ───────────────────────────────────────────────
  const toDelete = new Set();   // doc IDs to delete
  const toKeep   = new Set();   // doc IDs to keep

  // Pass A: garbage single-letter entries + "Grade …" entries
  for (const doc of docs) {
    if (isGarbage(doc.name)) {
      console.log(`  [GARBAGE]  "${doc.name}"  (id: ${doc.id}) → will delete`);
      toDelete.add(doc.id);
    } else if (startsWithGrade(doc.name)) {
      console.log(`  [GRADE-PREFIX]  "${doc.name}"  (id: ${doc.id}) → will delete`);
      toDelete.add(doc.id);
    }
  }

  // Pass B: duplicate detection via normalised key
  // Group remaining (not already scheduled for deletion) docs by their normalised key.
  const groups = {};   // normKey → [doc, …]
  for (const doc of docs) {
    if (toDelete.has(doc.id)) continue;
    const key = normalise(doc.name);
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }

  console.log('\nDuplicate groups:\n');
  for (const [key, group] of Object.entries(groups)) {
    if (group.length === 1) {
      // No duplicate — keep it
      toKeep.add(group[0].id);
      continue;
    }

    // Multiple docs share the same normalised key → pick the canonical one
    console.log(`  Key "${key}" has ${group.length} entries:`);
    group.forEach(d => console.log(`    · "${d.name}"  (id: ${d.id})`));

    const canonical = group.find(d => isCanonical(d.name));
    if (canonical) {
      toKeep.add(canonical.id);
      console.log(`    → Keeping: "${canonical.name}"  (id: ${canonical.id})`);
      for (const d of group) {
        if (d.id !== canonical.id) {
          toDelete.add(d.id);
          console.log(`    → Deleting: "${d.name}"  (id: ${d.id})`);
        }
      }
    } else {
      // No canonical form found — keep the first one, delete the rest
      const keeper = group[0];
      toKeep.add(keeper.id);
      console.log(`    → No canonical form; keeping first: "${keeper.name}"  (id: ${keeper.id})`);
      for (const d of group.slice(1)) {
        toDelete.add(d.id);
        console.log(`    → Deleting: "${d.name}"  (id: ${d.id})`);
      }
    }
  }

  // Docs not yet assigned (weren't in any duplicate group) → keep
  for (const doc of docs) {
    if (!toDelete.has(doc.id) && !toKeep.has(doc.id)) {
      toKeep.add(doc.id);
    }
  }

  // ── 3. Execute deletions ─────────────────────────────────────────────────────
  console.log(`\n── Executing ${toDelete.size} deletion(s) ──\n`);

  const deletedNames = [];
  const keptNames    = [];

  for (const doc of docs) {
    if (toDelete.has(doc.id)) {
      await doc.ref.delete();
      deletedNames.push(`"${doc.name}" (id: ${doc.id})`);
      console.log(`  Deleted: "${doc.name}"  (id: ${doc.id})`);
    }
  }

  for (const doc of docs) {
    if (toKeep.has(doc.id)) {
      keptNames.push(`"${doc.name}" (id: ${doc.id})`);
    }
  }

  // ── 4. Final report ──────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log('         FINAL REPORT');
  console.log('══════════════════════════════════════════');

  console.log(`\nDeleted (${deletedNames.length}):`);
  if (deletedNames.length === 0) {
    console.log('  (none)');
  } else {
    deletedNames.forEach(n => console.log(`  - ${n}`));
  }

  console.log(`\nKept (${keptNames.length}):`);
  if (keptNames.length === 0) {
    console.log('  (none)');
  } else {
    keptNames.forEach(n => console.log(`  + ${n}`));
  }

  console.log('\n══════════════════════════════════════════\n');
  process.exit(0);
}

main().catch(err => {
  console.error('[cleanClasses] Fatal error:', err);
  process.exit(1);
});
