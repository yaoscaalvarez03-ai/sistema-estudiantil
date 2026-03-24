
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sistema-estudiantil-58bc2'
  });
}

const db = admin.firestore();

async function fixAdrian() {
  console.log("Searching for Adrian...");
  const snap = await db.collection('users').get();
  let found = false;
  
  for (const d of snap.docs) {
    const data = d.data();
    const name = (data.displayName || data.nombres || "").toLowerCase();
    const email = (data.email || "").toLowerCase();
    
    if (name.includes('adrian') || email.includes('adrian')) {
      console.log(`Found: ${d.id} | Email: ${data.email} | Current Role: ${data.role}`);
      if (data.role === 'admin') {
        console.log("Fixing role to 'student'...");
        await db.collection('users').doc(d.id).update({ 
          role: 'student',
          displayName: data.displayName === 'Admin Restablecido' ? 'Adrian' : data.displayName 
        });
        console.log("Fixed.");
      }
      found = true;
    }
  }
  
  if (!found) console.log("Adrian not found.");
}

fixAdrian().catch(console.error);
