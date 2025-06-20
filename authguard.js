const html = document.documentElement;

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const snapshot = await firebase.firestore()
        .collection("users")
        .where("FirestoreUserAuthID", "==", user.uid)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        console.log("✅ User is signed in:", user.uid);
      //  console.log("📄 User data from Firestore:", userData);

        if (userData.status === 'inactive') {
          alert("🚫 Your account is currently inactive. Please contact the admin.");
          await firebase.auth().signOut();
          window.location.href = 'index.html';
        } else {
          // ✅ Access allowed
          document.querySelector("html").style.display = "block";
          document.body.style.visibility = "visible";
        }
      } else {
        alert("🚫 User data not found in the database.");
        await firebase.auth().signOut();
        window.location.href = 'index.html';
      }

    } catch (error) {
      console.error("Error fetching user data:", error);
      alert("🚫 Error checking account status. Try again later.");
      await firebase.auth().signOut();
      window.location.href = 'index.html';
    }

  } else {
    alert("🚫 You are not authorized to view this page. Please login first.");
    window.location.href = 'index.html';
  }
});


