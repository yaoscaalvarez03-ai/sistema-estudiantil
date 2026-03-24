
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sistema-estudiantil-58bc2'
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function fullDiagnostic() {
  const email = 'geraldpoveda98@gmail.com';
  console.log(`--- DIAGNOSTIC FOR: ${email} ---`);
  
  // 1. Check Auth
  try {
    const authUser = await auth.getUserByEmail(email);
    console.log(`AUTH: Found UID ${authUser.uid}`);
  } catch (e) {
    console.log(`AUTH: Not found (${e.message})`);
    
    // List some auth users to see if we are even connected correctly
    const list = await auth.listUsers(10);
    console.log(`AUTH: Sample users in project: ${list.users.map(u => u.email).join(', ')}`);
  }
  
  // 2. Check Firestore 'users'
  const usersSnap = await db.collection('users').where('email', '==', email).get();
  if (usersSnap.empty) {
    console.log(`FIRESTORE (users): No document found with email ${email}`);
  } else {
    console.log(`FIRESTORE (users): Found ${usersSnap.docs.length} documents:`);
    usersSnap.docs.forEach(d => {
      console.log(`- ID: ${d.id}, Role: ${d.data().role}, Names: ${d.data().nombres || d.data().displayName}`);
    });
  }

  // 3. Check Firestore 'registration_requests'
  const reqSnap = await db.collection('registration_requests').where('email', '==', email).get();
  if (reqSnap.empty) {
    console.log(`FIRESTORE (requests): No request found.`);
  } else {
    console.log(`FIRESTORE (requests): Found ${reqSnap.docs.length} requests:`);
    reqSnap.docs.forEach(d => {
      console.log(`- ID: ${d.id}, Status: ${d.data().status}`);
    });
  }
}

fullDiagnostic().catch(console.error);
