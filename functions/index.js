const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * changeUserPassword — Cloud Function v1
 */
exports.changeUserPassword = functions.region('us-central1').https.onCall(async (data, context) => {
  // 1. Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }

  // 2. Verify admin role
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerDoc = await db.collection('users').doc(callerUid).get();

  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores.');
  }

  const { uid, newPassword } = data;
  if (!uid || !newPassword || newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Datos inválidos.');
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    return { success: true };
  } catch (err) {
    console.error(err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

/**
 * changeUserEmail — Cloud Function v1
 */
exports.changeUserEmail = functions.region('us-central1').https.onCall(async (data, context) => {
  // 1. Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }

  // 2. Verify admin role
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerDoc = await db.collection('users').doc(callerUid).get();

  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores.');
  }

  const { uid, newEmail } = data;
  if (!uid || !newEmail || !newEmail.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'Datos inválidos.');
  }

  try {
    await admin.auth().updateUser(uid, { email: newEmail });
    return { success: true };
  } catch (err) {
    console.error(err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

/**
 * changeOwnPassword — Cloud Function v1
 */
exports.changeOwnPassword = functions.region('us-central1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }

  const { newPassword } = data;
  if (!newPassword || newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
  }

  try {
    await admin.auth().updateUser(context.auth.uid, { password: newPassword });
    return { success: true };
  } catch (err) {
    console.error(err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});
