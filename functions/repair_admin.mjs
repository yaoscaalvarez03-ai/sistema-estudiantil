
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sistema-estudiantil-58bc2'
  });
}

const db = admin.firestore();

async function repairUser() {
  const uid = 'vrUVhj1nFqQYjSQN5x7DB6MJcRH2';
  const email = 'geraldpoveda98@gmail.com';
  
  console.log(`Checking UID: ${uid}`);
  const docRef = db.collection('users').doc(uid);
  const docSnap = await docRef.get();
  
  if (docSnap.exists) {
    console.log("Document exists. Data:", docSnap.data());
    // Ensure role is admin
    if (docSnap.data().role !== 'admin') {
      console.log("Fixing role to admin...");
      await docRef.update({ role: 'admin' });
    }
  } else {
    console.log("Document MISSING. Creating it now as Admin...");
    await docRef.set({
      email: email,
      role: 'admin',
      displayName: 'Admin (Restored)',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("Repair complete.");
  }
}

repairUser().catch(console.error);
