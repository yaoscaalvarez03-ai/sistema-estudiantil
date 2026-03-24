
const admin = require('firebase-admin');

// No service account needed if running in a project with ADC or if initialized with proper env
admin.initializeApp({
  projectId: 'sistema-estudiantil-58bc2'
});

const db = admin.firestore();

async function inspectUsers() {
  const emailToSearch = 'geraldpoveda98@gmail.com';
  console.log(`Searching for email: "${emailToSearch}"`);
  
  const snap = await db.collection('users').get();
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const matches = users.filter(u => u.email && u.email.toLowerCase().trim() === emailToSearch.toLowerCase().trim());
  
  console.log(`Found ${matches.length} matches:`);
  matches.forEach(u => {
    console.log(`- ID: ${u.id}, Email: "${u.email}", Role: ${u.role}, Nombres: ${u.nombres || u.displayName}`);
  });
  
  // Also check Auth
  try {
    const authUser = await admin.auth().getUserByEmail(emailToSearch);
    console.log(`\nAuth User Found:`);
    console.log(`- UID: ${authUser.uid}, Email: ${authUser.email}`);
  } catch (e) {
    console.log(`\nAuth User NOT found: ${e.message}`);
  }
}

inspectUsers();
