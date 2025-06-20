async function loadUsers() {
    
      console.log("Loading users...");
  if ($.fn.DataTable.isDataTable('#dataTable')) {
    $('#dataTable').DataTable().clear().destroy();
  }

  const tableBody = $('#user_management-table-body');
  tableBody.empty();

  try {
    const snapshot = await db.collection("users").get();

    console.log(snapshot);

    snapshot.forEach(doc => {
      const user = doc.data();
      const userId = doc.id;
      const passwordFieldId = `password-${userId}`;
      const eyeIconId = `eye-icon-${userId}`;
      const createdAtFormatted = formatTimestamp(user.createdAt);
      const status = user.status;
      const row = `
        <tr data-user-id="${userId}">
          <td>${user.FirstName || '-'}</td>
          <td>${user.email || '-'}</td>
          <td>${user.Role || '-'}</td>
          <td>
            <div class="input-group">
              <input type="password" class="form-control form-control-sm" value="${user.password || ''}" id="${passwordFieldId}" readonly>
              <div class="input-group-append">
                <button class="btn btn-sm btn-outline-secondary toggle-password" type="button" data-target="${passwordFieldId}" data-icon="${eyeIconId}">
                  <i class="fas fa-eye" id="${eyeIconId}"></i>
                </button>
              </div>
            </div>
          </td>
           <td>${createdAtFormatted || '-'}</td>
           
        <td>
      <label class="switch">
        <input type="checkbox" id="statusToggle-${userId}" ${status === 'active' ? 'checked' : ''} onchange="toggleStatus('${userId}', this)">
        <span class="slider round"></span>
      </label>
      <span class="ml-1 badge ${status === 'active' ? 'badge-success' : 'badge-secondary'}">${status}</span>
    </td>
        </tr>
      `;
      tableBody.append(row);
    });

    $('#dataTable').DataTable();
  } catch (error) {
    console.error("Error loading users:", error);
  }
}
//*************************************************************************************************************** */
function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  
  // Firestore Timestamp object has a toDate() method that returns a JS Date
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  // Format to "Month Day, Year" using toLocaleDateString:
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/*************************************************************************************************************** */
// Toggle password visibility
$(document).ready(function () {
  $('#togglePassword').on('click', function () {
    const input = document.getElementById('userPassword');
    const icon = document.getElementById('eyeIcon');

    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
});

// Initialize Firebase Functions SDK (make sure Firebase app is initialized)
//const functions = firebase.app().functions(); // or use region: functions('us-central1')

// Reference your callable Cloud Function
//const deleteUserFunction = firebase.app().functions("us-central1").httpsCallable("deleteUser");


async function toggleStatus(userId, checkboxElement) {
  const newStatus = checkboxElement.checked ? "active" : "inactive";

  try {
    await firebase.firestore().collection("users").doc(userId).update({
      status: newStatus
    });

    const badge = checkboxElement.parentElement.nextElementSibling;
    badge.textContent = newStatus;
    badge.className = `ml-1 badge ${newStatus === 'active' ? 'badge-success' : 'badge-secondary'}`;

    console.log(`Status for ${userId} updated to ${newStatus}`);
  } catch (error) {
    console.error("Failed to update status:", error);
    alert("Failed to update status. Please try again.");
    // Revert checkbox state on error
    checkboxElement.checked = !checkboxElement.checked;
  }
}


$(document).ready(function () {
  console.log("Document is ready.");

  // Safe check before calling DataTable
  if ($.fn.DataTable && $.fn.DataTable.isDataTable('#dataTable')) {
    $('#dataTable').DataTable().clear().destroy();
  }

  loadUsers();

$('#userForm').on('submit', async function (e) {
  e.preventDefault();
  console.log("Form submission triggered.");

  const name = $('#userName').val().trim();
  const email = $('#userEmail').val().trim();
  const password = $('#userPassword').val().trim();
  const role = $('#userRole').val();
  

  if (!name || !email || !password || !role) {
    alert("Please fill all fields.");
    return;
  }

  try {
    // Step 1: Create user in Firebase Auth
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // Step 2: Save user profile to Firestore using UID
    await db.collection('users').doc(uid).set({
      FirstName: name,
      email: email.toLowerCase(),
      Role: role,
      createdAt: firebase.firestore.Timestamp.now(),
      password : password,
      FirestoreUserAuthID : uid,
      status: "Inactive"
    

    });

    alert("User created and saved in Auth + Firestore!");
    $('#userForm')[0].reset();
    loadUsers();

  } catch (error) {
    console.error("Error creating user:", error);
    alert("Failed to create user. Reason: " + error.message);
  }
});

});


  firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    const currentUID = user.uid;
console.log(currentUID);
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
    document.getElementById('userRoleDisplay').innerHTML = `${role}`;
        console.log('User role:', role);

        // Redirect or customize view
     ////   if (role === 'Mentor') {
           // document.getElementById('userManagementMenuItem').style.display = 'none';
         // window.location.href = 'mentor-dashboard.html';
    //    } else if (role === 'Admin') {
         // window.location.href = 'admin-dashboard.html';
         ////     document.getElementById('userManagementMenuItem').style.display = 'block';
     ///   } else {
      //       console.log(user.uid);
         // alert("Unknown role. Please contact admin.");
    //    }

   //   } else {
    //    console.error("No matching user found in Firestore.");
   //     alert("User profile not found. Please contact support.");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  } else {
    console.log("No user is currently signed in.");
  }
});



