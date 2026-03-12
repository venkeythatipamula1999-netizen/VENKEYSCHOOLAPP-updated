'use strict';

const router = require('express').Router();
const admin = require('firebase-admin');
const { sendAndLog } = require('../services/whatsappService');

function getDb() {
  return admin.firestore();
}

async function fetchSchoolName(schoolId) {
  const db = getDb();
  const snap = await db.collection('schools').doc(schoolId).get();
  if (!snap.exists) return '';
  return snap.data().name || '';
}

router.post('/attendance', async (req, res) => {
  try {
    const { schoolId, toPhone, parentName, studentName, className, status, date } = req.body;
    const schoolName = await fetchSchoolName(schoolId);
    await sendAndLog(
      schoolId,
      toPhone,
      'vl_attendance',
      [parentName, studentName, className, status, date, schoolName],
      { studentName, classId: className }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[WhatsApp /attendance]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/fee-reminder', async (req, res) => {
  try {
    const { schoolId, toPhone, parentName, studentName, amount, dueDate } = req.body;
    const schoolName = await fetchSchoolName(schoolId);
    await sendAndLog(
      schoolId,
      toPhone,
      'vl_fee_reminder',
      [parentName, studentName, String(amount), dueDate, schoolName],
      { studentName }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[WhatsApp /fee-reminder]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/exam-result', async (req, res) => {
  try {
    const { schoolId, toPhone, studentName, examName, marksObtained, totalMarks, percentage, grade } = req.body;
    const schoolName = await fetchSchoolName(schoolId);
    await sendAndLog(
      schoolId,
      toPhone,
      'vl_exam_result',
      [studentName, examName, String(marksObtained), String(totalMarks), String(percentage), grade, schoolName],
      { studentName }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[WhatsApp /exam-result]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/announcement', async (req, res) => {
  try {
    const { schoolId, toPhones, message, date } = req.body;
    if (!Array.isArray(toPhones) || toPhones.length === 0) {
      return res.status(400).json({ success: false, error: 'toPhones must be a non-empty array' });
    }
    const schoolName = await fetchSchoolName(schoolId);
    for (const toPhone of toPhones) {
      await sendAndLog(
        schoolId,
        toPhone,
        'vl_announcement',
        [schoolName, message, date],
        {}
      );
    }
    res.json({ success: true, sent: toPhones.length });
  } catch (err) {
    console.error('[WhatsApp /announcement]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/emergency', async (req, res) => {
  try {
    const { schoolId, toPhones, message, contactNumber } = req.body;
    if (!Array.isArray(toPhones) || toPhones.length === 0) {
      return res.status(400).json({ success: false, error: 'toPhones must be a non-empty array' });
    }
    const schoolName = await fetchSchoolName(schoolId);
    for (const toPhone of toPhones) {
      await sendAndLog(
        schoolId,
        toPhone,
        'vl_emergency',
        [schoolName, message, contactNumber],
        {}
      );
    }
    res.json({ success: true, sent: toPhones.length });
  } catch (err) {
    console.error('[WhatsApp /emergency]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { phoneNumberId, accessToken, toPhone } = req.body;
    if (!phoneNumberId || !accessToken || !toPhone) {
      return res.status(400).json({ success: false, error: 'phoneNumberId, accessToken and toPhone are required' });
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'template',
      template: {
        name: 'vl_attendance',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Test' },
              { type: 'text', text: 'Connection' },
              { type: 'text', text: 'Class 1' },
              { type: 'text', text: 'present' },
              { type: 'text', text: 'today' },
              { type: 'text', text: 'Vidhaya Layam' },
            ],
          },
        ],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return res.json({ success: true });
    }

    const errData = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `Meta API returned status ${response.status}`;
    return res.json({ success: false, error: errMsg });
  } catch (err) {
    console.error('[WhatsApp /test]', err.message);
    res.json({ success: false, error: err.message });
  }
});

router.get('/webhook', (req, res) => {
  const mode        = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge   = req.query['hub.challenge'];

  if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/webhook', (req, res) => {
  res.sendStatus(200);

  (async () => {
    try {
      const db = getDb();
      const entries = req.body?.entry || [];

      for (const entry of entries) {
        for (const change of (entry.changes || [])) {
          for (const status of (change.value?.statuses || [])) {
            const deliveryStatus = status.status;
            const recipientPhone = status.recipient_id;

            const snap = await db.collection('whatsapp_logs')
              .where('recipient', '==', recipientPhone)
              .orderBy('sentAt', 'desc')
              .limit(1)
              .get();

            if (snap.empty) continue;

            const docRef = snap.docs[0].ref;
            const update = { status: deliveryStatus };

            if (deliveryStatus === 'failed' && status.errors?.length) {
              update.errorReason = status.errors[0].title;
            }

            await docRef.update(update);
          }
        }
      }
    } catch (err) {
      console.error('[WhatsApp /webhook POST]', err.message);
    }
  })();
});

module.exports = router;
