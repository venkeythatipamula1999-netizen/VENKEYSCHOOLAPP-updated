'use strict';

const admin = require('firebase-admin');

function getDb() {
  return admin.firestore();
}

const TEMPLATE_TYPE_MAP = {
  vl_attendance:   'attendance',
  vl_fee_reminder: 'fees',
  vl_exam_result:  'exams',
  vl_announcement: 'announcement',
  vl_emergency:    'emergency',
};

function nowIST() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dd  = String(ist.getDate()).padStart(2, '0');
  const mon = ist.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });
  const yyyy = ist.getFullYear();
  const hh  = String(ist.getHours()).padStart(2, '0');
  const mm  = String(ist.getMinutes()).padStart(2, '0');
  return `${dd} ${mon} ${yyyy} ${hh}:${mm}`;
}

async function getSchoolWhatsAppConfig(schoolId) {
  const db = getDb();
  const snap = await db.collection('schools').doc(schoolId).get();
  if (!snap.exists) {
    throw new Error('WhatsApp not configured for this school');
  }
  const config = snap.data().whatsappConfig;
  if (!config || !config.phoneNumberId) {
    throw new Error('WhatsApp not configured for this school');
  }
  return config;
}

async function sendWhatsAppTemplate(schoolId, toPhone, templateName, variablesArray) {
  const config = await getSchoolWhatsAppConfig(schoolId);
  const { phoneNumberId, accessToken } = config;

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: toPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: variablesArray.map(v => ({ type: 'text', text: String(v) })),
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

  const data = await response.json();
  return data;
}

async function logWhatsAppMessage(schoolId, toPhone, templateName, status, errorReason, extraFields) {
  const db = getDb();

  const type = TEMPLATE_TYPE_MAP[templateName] || templateName;

  const doc = {
    schoolId,
    recipient: toPhone,
    templateName,
    type,
    status,
    errorReason: errorReason || null,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    ts: nowIST(),
    ...(extraFields || {}),
  };

  await db.collection('whatsapp_logs').add(doc);
}

async function sendAndLog(schoolId, toPhone, templateName, variablesArray, extraFields) {
  try {
    await sendWhatsAppTemplate(schoolId, toPhone, templateName, variablesArray);
    await logWhatsAppMessage(schoolId, toPhone, templateName, 'sent', null, extraFields);
  } catch (err) {
    console.error(`[WhatsApp] Failed — schoolId=${schoolId} to=${toPhone}:`, err.message);
    await logWhatsAppMessage(schoolId, toPhone, templateName, 'failed', err.message, extraFields);
  }
}

module.exports = {
  getSchoolWhatsAppConfig,
  sendWhatsAppTemplate,
  logWhatsAppMessage,
  sendAndLog,
};
