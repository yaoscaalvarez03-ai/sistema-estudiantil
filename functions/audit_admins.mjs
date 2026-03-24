
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sistema-estudiantil-58bc2'
  });
}

const db = admin.firestore();

async function auditAdmins() {
  console.log("--- AUDITING ADMIN USERS ---");
  const snap = await db.collection('users').where('role', '==', 'admin').get();
  
  if (snap.empty) {
    console.log("No admins found.");
    return;
  }

  const admins = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  // Sort by creation date if available, or just list them
  admins.forEach(u => {
    const created = u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate().toLocaleString() : u.createdAt) : "Unknown";
    console.log(`[${u.role.toUpperCase()}] Email: ${u.email} | Name: ${u.displayName || u.nombres || 'N/A'} | Created: ${created} | UID: ${u.id}`);
  });
  
  console.log(`Total Admins: ${admins.length}`);
}

auditAdmins().catch(console.error);
