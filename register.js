// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAB1A6TZ4f6FpEkAVeDfUWhatz6Fqe3exU",
  authDomain: "lessons-plan---skyway.firebaseapp.com",
  projectId: "lessons-plan---skyway",
  storageBucket: "lessons-plan---skyway.firebasestorage.app",
  messagingSenderId: "266576510152",
  appId: "1:266576510152:web:c6de75198eaefc4403b9fd",
  measurementId: "G-T7R6SEL4W0"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
console.log("DOM Loaded!");
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
    console.log("DOM Loaded!");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("exampleFirstName").value.trim();
    const lastName = document.getElementById("exampleLastName").value.trim();
    const email = document.getElementById("exampleInputEmail").value.trim();
    const password = document.getElementById("exampleInputPassword").value;
    const repeatPassword = document.getElementById("exampleRepeatPassword").value;

    if (!firstName || !lastName || !email || !password || !repeatPassword) {
      return alert("Please fill in all fields.");
    }

    if (password !== repeatPassword) {
      return alert("Passwords do not match.");
    }

    try {
      // 🔐 Create user in Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // 🔄 Save additional user data to Firestore (NO password!)
      await db.collection("users").doc(user.uid).set({
        FirstName: firstName,
        LastName: lastName,
        email: email,
        Role: "Mentor",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("Registration successful!");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Registration error:", error);
      alert(error.message || "Something went wrong.");
    }
  });
});
