/**
 * Firebase Cloud Functions Outline
 * 
 * This is an outline of the Cloud Function used to trigger Web Push notifications
 * when a class session concludes.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Run every 5 minutes to check for concluded classes
exports.checkCompletedClasses = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const db = admin.firestore();
  
  // 1. Get current time and day of week
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  // Format HH:mm for comparison
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // 2. Query classes
  // In a real scenario, you'd likely want to query an intermediate schedule collection
  // to avoid scanning all classes, or check a "lastNotified" timestamp.
  const classesSnapshot = await db.collection('classes').get();
  
  for (const classDoc of classesSnapshot.docs) {
    const classData = classDoc.data();
    
    // Check if class finished recently (e.g., within the last 5-10 minutes)
    const justFinishedSchedule = classData.schedule.find(s => {
        if (s.dayOfWeek !== currentDayOfWeek) return false;
        
        // Basic time comparison logic
        // This assumes s.endTime is "HH:mm"
        // Let's assume class ended if currentTime >= s.endTime and we haven't notified yet today
        // (Implementation details of tracking "notified today" omitted for brevity)
        return currentTime >= s.endTime; 
    });
    
    if (justFinishedSchedule) {
      // 3. Get instructor's FCM tokens
      const instructorDoc = await db.collection('users').doc(classData.instructorId).get();
      if (instructorDoc.exists) {
        const fcmTokens = instructorDoc.data().fcmTokens || [];
        
        if (fcmTokens.length > 0) {
          // 4. Send Push Notification
          const payload = {
            notification: {
              title: 'Class Concluded',
              body: `Your ${classData.subjectCode} class just ended. Tap here to log your syllabus progress!`,
              // Add custom data for deep linking
            },
            data: {
              url: `/?logClassId=${classDoc.id}`
            }
          };
          
          try {
            await admin.messaging().sendToDevice(fcmTokens, payload);
            console.log(`Notification sent for class ${classDoc.id}`);
            // TODO: Mark class as notified for today to prevent duplicates
          } catch (error) {
            console.error('Error sending push notification:', error);
          }
        }
      }
    }
  }
  
  return null;
});
