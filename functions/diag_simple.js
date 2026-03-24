
const admin = require('firebase-admin');

// Trying to use application default or just local auth if possible
try {
  admin.initializeApp({
    projectId: 'sistema-estudiantil-58bc2'
  });
} catch (e) {
  console.error("Initialization error:", e.message);
}

const db = admin.firestore();

async function checkUser() {
  const uid = 'vrUVhj1nFqQYjSQN5x7DB6MJcRH2';
  const email = 'geraldpoveda98@gmail.com';
  
  console.log(`Checking UID: ${uid}`);
  try {
    const docRef = db.collection('users').doc(uid);
    const snap = await docRef.get();
    if (!snap.exists) {
      console.log("NOT FOUND in users collection.");
      
      // SEARCH BY EMAIL
      const emailSnap = await db.collection('users').where('email', '==', email).get();
      if (emailSnap.empty) {
        console.log("ALSO NOT FOUND BY EMAIL.");
      } else {
        console.log(`FOUND BY EMAIL (${emailSnap.docs.length} docs):`);
        emailSnap.docs.forEach(d => console.log(`- UID: ${d.id}, Role: ${d.data().role}`));
      }
    } else {
      console.log("FOUND DOC:", JSON.stringify(snap.data(), null, 2));
    }
  } catch (e) {
    console.error("Query error:", e.message);
  }
}

checkUser();
