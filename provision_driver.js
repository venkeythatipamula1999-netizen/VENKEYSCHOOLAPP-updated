require('dotenv').config();
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function run() {
    console.log('--- Provisioning Driver & Bus (With Credentials) ---');
    
    // 1. Create Driver User
    const driverId = "DRV-1001";
    await db.collection('users').doc('drv_qa_doc_001').set({
        role_id: driverId,
        full_name: "QA Driver One",
        role: "driver",
        status: "active",
        schoolId: "VLK-KARI",
        email: "qa.driver@test.edu"
    }, { merge: true });
    console.log('Driver DRV-1001 created/updated.');

    // 2. Create Bus
    const busId = "BUS-QA-99";
    await db.collection('buses').doc(busId).set({
        busId: busId,
        busNumber: "QA-9999",
        busModel: "Test Bus",
        capacity: 40,
        driverId: driverId,
        driverName: "QA Driver One",
        schoolId: "VLK-KARI",
        status: "active"
    }, { merge: true });
    console.log('Bus BUS-QA-99 created/updated.');
    
    // 3. Link Student to this Bus
    const studentId = "STU1775570289385";
    const studentQ = await db.collection('students').where('studentId', '==', studentId).get();
    if (!studentQ.empty) {
        await studentQ.docs[0].ref.update({ busId: busId });
        console.log(`Student ${studentId} linked to Bus ${busId}.`);
    } else {
        console.error('Student not found!');
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
