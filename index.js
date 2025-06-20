// login.js

firebase.initializeApp(firebaseConfig);

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("exampleInputEmail").value.trim();
  const password = document.getElementById("exampleInputPassword").value;

  try {
    // Step 1: Firebase Auth sign-in
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;


    // Step 2: Check Firestore for user document by email
    const querySnapshot = await db.collection("users")
      .where("email", "==", user.email)
      .limit(1)
      .get();
      

    if (querySnapshot.empty) {
      alert("Authenticated, but no user data found. Contact admin.");
      await firebase.auth().signOut();
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Step 3: Save user info in sessionStorage
    sessionStorage.setItem("userRole", userData.Role);
    sessionStorage.setItem("userName", userData.FirstName);
    sessionStorage.setItem("userEmail", user.email);

    alert(`Login successful! Welcome ${userData.FirstName}`);

    // Step 4: Redirect to landing page
    window.location.href = `LandingPage.html`;

  } catch (error) {
    console.error("Login error:", error.message);
    alert("Login failed: " + error.message);
  }
});
