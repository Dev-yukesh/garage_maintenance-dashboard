/*****************************************
 * Global Variable
 *****************************************/
let currentUserRole = '';
let partsData = [];
let dataTableInstance = null;

/*****************************************
 * Initialize User Authentication
 *****************************************/
$(document).ready(function () {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'Unauthorized',
        text: '⛔ You are not authorized to view this page.'
      }).then(() => {
        window.location.href = "/index.html";
      });
      return;
    }

    const currentUID = user.uid;
    try {
      const querySnapshot = await firebase.firestore()
        .collection('users')
        .where('FirestoreUserAuthID', '==', currentUID)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        currentUserRole = userData.Role;
        const firstName = userData.FirstName || "User";

        $('#userFirstName').text(firstName);
        $('#userRoleDisplay').html(currentUserRole);

        if (currentUserRole === 'Mechanic') {
          $('#userManagementMenuItem').hide();
          $('#partsInventoryMenuItem').hide();
        } else {
          $('#userManagementMenuItem').show();
          $('#partsInventoryMenuItem').show();
        }

        loadPartsFromFirestore();
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Oops...',
          text: 'User profile not found.'
        });
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while fetching user role.'
      });
    }
  });
});

/*****************************************
 * Load Parts from Firestore
 *****************************************/
async function loadPartsFromFirestore() {
  const tableBody = document.getElementById("partsTableBody");
  partsData = []; // Reset local data
  const partNumberToTest = "21528785";

  try {
    const snapshot = await firebase.firestore().collection("partsInventory")
   // .where("part_number", "==", partNumberToTest)
    .get();

    snapshot.forEach(doc => {
      
      const data = doc.data();
      partsData.push({
      category: data.category,
  partNumber: data.partNumber,          // ✅ use camelCase
  description: data.description,        // ✅ use camelCase
  location: data.location,
  partsOnHand: data.partsOnHand,        // ✅ use camelCase
  min_quantity: data.min_quantity,
  max_quantity: data.max_quantity,
  quantity_to_order: data.quantity_to_order,
  docId: doc.id
      });
    });

    renderTable();
  } catch (err) {
    console.error("Error loading parts:", err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to load parts data.'
    });
  }
}

/*****************************************
 * Render DataTable
 *****************************************/
function renderTable(filteredData = partsData) {
  const tableBody = document.getElementById('partsTableBody');
  tableBody.innerHTML = '';

  filteredData.forEach((part, index) => {
    const row = document.createElement('tr');
    if (part.partsOnHand < 3) {
      row.classList.add('table-warning');
    }

    row.innerHTML = `
      <td>${part.category}</td>
      <td>${part.partNumber}</td>
      <td>${part.description}</td>
      <td>${part.location}</td>
      <td class="text-center">${part.partsOnHand}</td>
      <td class="text-center">${part.min_quantity}</td>
      <td class="text-center">${part.max_quantity}</td>
      <td class="text-center">${part.quantity_to_order}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary" onclick="editPart(${index})">Edit</button>
      
      </td>
    `;
    tableBody.appendChild(row);
  });
//  <button class="btn btn-sm btn-outline-danger ms-1" onclick="deletePart(${index})">Delete</button>
  if (dataTableInstance) {
    dataTableInstance.destroy();
  }

  dataTableInstance = $('#partsTable').DataTable({
    responsive: true,
    lengthChange: false,
    searching: true,
    pageLength: 5,
    destroy: true,
    scrollX: true,
    columnDefs: [{ targets: '_all', className: 'dt-center' }]
  });

  // Live column search
  $('#category, #partNumber, #description, #location').on('keyup', function () {
    const index = { category: 0, partNumber: 1, description: 2, location: 3 }[this.id];
    dataTableInstance.column(index).search(this.value).draw();
  });
}

/*****************************************
 * Form Submit - Add or Edit Part
 *****************************************/
const form = document.getElementById('partsForm');
const cancelEditBtn = document.getElementById('cancelEdit');

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const category = document.getElementById('category').value.trim();
  const partNumber = document.getElementById('partNumber').value.trim();
  const description = document.getElementById('description').value.trim();
  const location = document.getElementById('location').value.trim();
  const partsOnHand = parseInt(document.getElementById('partsOnHand').value, 10);
  const minQuantity = parseInt(document.getElementById('minQuantity').value, 10);
  const maxQuantity = parseInt(document.getElementById('maxQuantity').value, 10);
  const quantityToOrder = partsOnHand < minQuantity ? maxQuantity - partsOnHand : 0;
  const editIndex = document.getElementById('editIndex').value;

  try {
    if (editIndex === '') {
      // Add new part
      await firebase.firestore().collection("partsInventory").add({
        category,
        part_number: partNumber,
        part_name: description,
        location,
        partsOnHand: partsOnHand,
        min_quantity: minQuantity,
        max_quantity: maxQuantity,
        quantity_to_order: quantityToOrder,
        date: new Date()
      });

      Swal.fire({ icon: 'success', title: 'Added', text: 'Part successfully added.' });
    } else {
      // Update existing part
      const docId = partsData[editIndex].docId;
      await firebase.firestore().collection("partsInventory").doc(docId).update({
        category,
        part_number: partNumber,
        part_name: description,
        location,
        partsOnHand: partsOnHand,
        min_quantity: minQuantity,
        max_quantity: maxQuantity,
        quantity_to_order: quantityToOrder,
        date: new Date()
      });

      Swal.fire({ icon: 'success', title: 'Updated', text: 'Part successfully updated.' });
    }

    form.reset();
    document.getElementById('editIndex').value = '';
    cancelEditBtn.style.display = 'none';
    loadPartsFromFirestore();

  } catch (err) {
    console.error("Save failed:", err);
    Swal.fire({ icon: 'error', title: 'Error', text: '❌ Failed to save part.' });
  }
});

/*****************************************
 * Edit Part Handler
 *****************************************/
window.editPart = function (index) {
  const part = partsData[index];

  document.getElementById('category').value = part.category;
  document.getElementById('partNumber').value = part.partNumber;
  document.getElementById('description').value = part.description;
  document.getElementById('location').value = part.location;
  document.getElementById('partsOnHand').value = part.partsOnHand;
  document.getElementById('minQuantity').value = part.min_quantity;
  document.getElementById('maxQuantity').value = part.max_quantity;
  document.getElementById('editIndex').value = index;

  cancelEditBtn.style.display = 'inline-block';
};

/*****************************************
 * Cancel Edit Handler
 *****************************************/
cancelEditBtn.addEventListener('click', () => {
  form.reset();
  document.getElementById('editIndex').value = '';
  cancelEditBtn.style.display = 'none';
});

/*****************************************
 * Delete Part Handler
 *****************************************/
window.deletePart = async function (index) {
  const part = partsData[index];
  const docId = part.docId;

  Swal.fire({
    title: 'Are you sure?',
    text: "Do you want to delete this part?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await firebase.firestore().collection("partsInventory").doc(docId).delete();
        Swal.fire('Deleted!', 'Part has been deleted.', 'success');
        loadPartsFromFirestore();
      } catch (err) {
        console.error("Failed to delete part:", err);
        Swal.fire('Error', 'Failed to delete part.', 'error');
      }
    }
  });
};
