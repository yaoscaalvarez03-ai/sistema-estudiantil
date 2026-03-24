import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'sistema-estudiantil-58bc2' });
const db = admin.firestore();
async function test() {
  const snap = await db.collection('groups').limit(1).get();
  console.log("Groups empty:", snap.empty);
  if (!snap.empty) console.log("First group name:", snap.docs[0].data().name);
}
test().catch(console.error);
