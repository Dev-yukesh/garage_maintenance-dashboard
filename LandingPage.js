document.addEventListener("DOMContentLoaded", function () {
    const completedEvaluationCountElement = document.getElementById("evaluation-count");
    const reviewedEvalCountElement = document.getElementById("reviewedEvaluation-count");
    const userEmailElement = document.getElementById("user-email"); // Optional

            if (completedEvaluationCountElement) {
                firebase.firestore().collection("lessonEvaluations")
                    .onSnapshot(snapshot => {
                        completedEvaluationCountElement.textContent = snapshot.size;
                    }, error => {
                        console.error("Error fetching evaluations:", error);
                        completedEvaluationCountElement.textContent = "Error";
                    });
            }

            if (reviewedEvalCountElement) {
    firebase.firestore().collection("lessonEvaluations")
        .where("status", "==", "Reviewed by Manager")
        .onSnapshot(snapshot => {
            reviewedEvalCountElement.textContent = snapshot.size;
        }, error => {
            console.error("Error fetching evaluations:", error);
            reviewedEvalCountElement.textContent = "Error";
        });
}
   
    firebase.auth().onAuthStateChanged(async (user) => {

  if (user) {
    const currentUID = user.uid;
      if (!user) {
      // Not logged in, redirect to login page
      window.location.href = "/index.html";
    }

    try {
      const querySnapshot = await firebase.firestore()
        .collection('users')
        .where('FirestoreUserAuthID', '==', currentUID)
        .limit(1) // Optimize for performance
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const userData = doc.data();
        const role = userData.Role;
        const firstName = userData.FirstName || "User";

           document.getElementById('userFirstName').textContent = firstName;
              // Set the role in the sidebar
      document.getElementById('userRoleDisplay').innerHTML = `${role}`;

        console.log('User role:', role);

        // Redirect or customize view
        if (role === 'Mechanic') {
            document.getElementById('userManagementMenuItem').style.display = 'none';
         // window.location.href = 'mentor-dashboard.html';
        } else if (role === 'Admin') {
         // window.location.href = 'admin-dashboard.html';
         console.log(role);
              document.getElementById('userManagementMenuItem').style.display = 'block';
               document.getElementById('partsInventoryMenuItem').style.display = 'block';
                 document.getElementById('whiteboardMenuItem').style.display = 'block';
                document.getElementById('userManagementDivider').style.display = 'block';
document.getElementById('whiteboardDivider').style.display = 'block';
document.getElementById('partsInventoryDivider').style.display = 'block';
        } else {
           console.log(currentUID);

         //
         //  alert("Unknown role. Please contact admin.");
        }

      } else {
        console.error("No matching user found in Firestore.");
        alert("User profile not found. Please contact support.");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  } else {
    console.log("No user is currently signed in.");
    
  }
});




});
