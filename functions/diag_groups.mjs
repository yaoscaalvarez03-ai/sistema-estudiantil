import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sistema-estudiantil-58bc2'
  });
}

const db = admin.firestore();

async function diagnose() {
  console.log("--- Diagnóstico de Grupos ---");
  const groupsSnap = await db.collection('groups').get();
  groupsSnap.forEach(doc => {
    const data = doc.data();
    const ids = data.studentIds || [];
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
      console.log(`Grupo [${data.name}] (ID: ${doc.id}) tiene duplicados: ${ids.length} total, ${uniqueIds.length} únicos.`);
    } else {
      console.log(`Grupo [${data.name}] (ID: ${doc.id}) está bien: ${ids.length} alumnos.`);
    }
  });

  console.log("\n--- Diagnóstico de Asistencia ---");
  const attendanceSnap = await db.collection('attendance').limit(20).get();
  if (attendanceSnap.empty) {
    console.log("No hay registros de asistencia.");
  } else {
    attendanceSnap.forEach(doc => {
      const data = doc.data();
      const records = data.records || [];
      const ids = records.map(r => r.studentId);
      const uniqueIds = [...new Set(ids)];
      if (ids.length !== uniqueIds.length) {
        console.log(`Asistencia [${data.date}] (ID: ${doc.id}, Grupo: ${data.groupName}) tiene duplicados en records: ${ids.length} total, ${uniqueIds.length} únicos.`);
      } else {
        console.log(`Asistencia [${data.date}] (ID: ${doc.id}, Grupo: ${data.groupName}) está bien.`);
      }
    });
  }
}

diagnose().catch(console.error);
