
import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'sistema-estudiantil-58bc2'
});

const db = admin.firestore();

async function inspectSpecificUser() {
  const uid = 'vrUVhj1nFqQYjSQN5x7DB6MJcRH2';
  console.log(`Inspecting UID: "${uid}"`);
  
  const userDoc = await db.collection('users').doc(uid).get();
  
  if (!userDoc.exists) {
    console.log(`FATAL: Document NOT FOUND in Firestore collection 'users'.`);
    
    // Check if it exists with another UID but same email
    const snap = await db.collection('users').where('email', '==', 'geraldpoveda98@gmail.com').get();
    if (!snap.empty) {
      console.log(`Found ${snap.docs.length} users with geraldpoveda98@gmail.com:`);
      snap.docs.forEach(d => console.log(`- UID: ${d.id}, Role: ${d.data().role}`));
    } else {
      console.log(`No users found with email geraldpoveda98@gmail.com in Firestore.`);
    }
  } else {
    console.log(`User data:`, JSON.stringify(userDoc.data(), null, 2));
  }
}

inspectSpecificUser();
