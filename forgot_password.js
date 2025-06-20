
// Initialize Firebase app
firebase.initializeApp(firebaseConfig);

// Now you can use Firebase services

const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
  const resetBtn = document.getElementById('resetBtn');
  const emailInput = document.getElementById('exampleInputEmail');

  resetBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    if (!email) {
      alert("Please enter your email.");
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email);
      alert("Password reset email sent. Please check your inbox.");
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert("Failed to send reset email. Please ensure the email is correct.");
    }
  });
});
