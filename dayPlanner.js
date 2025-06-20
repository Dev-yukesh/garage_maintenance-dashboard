/*****************************************Global Variable************************************************************* */

let currentUserRole = '';
let  allowedRoles = ['Admin', 'Supervisor'];

/*****************************************Global Variable************************************************************* */
/*******************************Mechanic notes handler***************************************** */


let newMechanicNotes = [];

$('#mechanicNoteInput').off('keydown').on('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();

    const noteText = $(this).val().trim();
    if (!noteText) return;

    const mechanicName = $('#editMechanic').val();
    const defectId = $('#editDefectId').val();
    const repairDate = $('#editRepairDate').val();
    const actualTime = $('#editActualTime').val();
    const kilometers = $('#editKM').val();
    const status = $('#editStatus').val();

    const newNote = {
      id: 'id-' + Date.now(),
      note: noteText,
      mechanic_name: mechanicName,
      defect_id: defectId,
      repairDate,
      actualTime,
      kilometers,
      status
    };

    newMechanicNotes.push(newNote);

    // Append to visible list
    $('#mechanicNotesList').append(`
      <li class="list-group-item">
        <strong>${mechanicName}:</strong> ${noteText}
      </li>
    `);

    $(this).val(''); // Clear input
  }
});

function renderPreviousMechanicNotes(notesArray) {
  const container = $('#previousNotesContainer');
  const notesDiv = $('#previousMechanicNotes');
  notesDiv.empty();

  if (!notesArray || notesArray.length === 0) {
    container.hide(); // Hide if no previous notes
    return;
  }

  notesArray.forEach(noteObj => {
    console.log('Note object:', noteObj); // Debug: See actual note data
    const mechanicName = noteObj.mechanic_name || 'Unknown Mechanic';
    const note = noteObj.note || '';
    const actualTime = noteObj.actualTime || '';

    const noteHtml = `
      <div style="margin-bottom: 12px; font-size: 14px; color: #333;">
        <strong>${mechanicName} says:</strong> ${note}
        ${actualTime ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">Actual Time Taken: ${actualTime}hrs</div>` : ''}
      </div>
    `;
    notesDiv.append(noteHtml);
  });

  container.show(); // Show the container since notes exist
}


/*******************************Mechanic notes handler***************************************** */
 // Array of notes like you showed
let partsUsed = [];      // Array pulled from Firestore with full part details




 /******************************************Start  Initialization of User Authentication*****************************************/
$(document).ready(function () {
  // Listen for Firebase auth state change
  firebase.auth().onAuthStateChanged(async (user) => {
    
    // If no user is logged in, redirect to login page
    if (!user) {
      alert("🚫 You are not authorized to view this page.");
      window.location.href = "/index.html";
      return;
    }

    const currentUID = user.uid;

    try {
      // Query Firestore for the user document with matching UID
      const querySnapshot = await firebase.firestore()
        .collection('users')
        .where('FirestoreUserAuthID', '==', currentUID)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        // Get user data and role
        const doc = querySnapshot.docs[0];
        const userData = doc.data();
        const role = userData.Role;
        const firstName = userData.FirstName || "User";
        currentUserRole = role;

        // Update UI with user's name and role
        $('#userFirstName').text(firstName);
        $('#userRoleDisplay').html(role);

        // Show/hide menu items based on role
        if (role === 'Mechanic') {
          $('#userManagementMenuItem').hide();
          $('#partsInventoryMenuItem').hide();
           $('#whiteboardMenuItem').hide();
          $('#whiteboardDivider').hide();
           $('#partsInventroyDivider').hide();
            $('#userManagementDivider').hide();
          
          
          
          
        } else {
          $('#userManagementMenuItem').show();
          $('#partsInventoryMenuItem').show();
                     $('#whiteboardMenuItem').show();
               $('#whiteboardDivider').show();
           $('#partsInventroyDivider').show();
            $('#userManagementDivider').show();
        }

        // Load defects data for authorized user
        console.log("Calling loadDefects...");
        loadDefects();

      } else {
        alert("User profile not found.");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  });
});
/******************************************End  Initialization of User Authentication*****************************************/
/*****************************************
/****************Calling this Data Table LoadDefect Function After User is Authenticated *****************************************/
async function loadDefects() {
  // Allowed roles that can see approval column
  //const allowedRoles = ['Admin', 'Supervisor'];
  console.log("Current user role:", currentUserRole);
  console.log("loadDefects working");

  // Destroy any existing DataTable instance to prevent reinitialization conflicts
  if ($.fn.DataTable.isDataTable('#dataTable')) {
    $('#dataTable').DataTable().clear().destroy();
  }

  const tableBody = $('#defect-table-body');
  tableBody.empty(); // Clear any previous rows

  try {
    // Fetch defect records excluding "Not Scheduled"
    const snapshot = await firebase.firestore()
      .collection("allDefects")
      .where("status", "!=", "Not Scheduled")
      .get();

    const data = snapshot.docs.map(doc => doc.data());
    
    // Sort defects by capture date in descending order
    data.sort((a, b) => {
      const dateA = a.defect_captured_date || "";
      const dateB = b.defect_captured_date || "";
      return dateB.localeCompare(dateA); // Most recent first
    });

    // Build table rows dynamically
    data.forEach(item => {
      // Format used parts (array of objects)
      const partsUsedStr = (item.parts_used && item.parts_used.length > 0)
        ? item.parts_used.map(part =>
          `<span style="color: green; font-weight: bold;">Part ID #:</span> <span style="background-color: blue; color: white;">${part.partNumber}</span>, 
           <span style="color: green; font-weight: bold;">Name:</span> <span style="background-color: yellow; color: black;">${part.description}</span>, 
           <span style="color: green; font-weight: bold;">Qty:</span> <span style="color: red;">${part.part_qty}</span>`
        ).join('<br>')
        : "-";

      // Format needed parts
      const partsNeededStr = (item.parts_needed && item.parts_needed.length > 0)
        ? item.parts_needed.map(part =>
          `<span style="color: green; font-weight: bold;">Part #:</span> <span style="background-color: blue; color: white;">${part.partNumber}</span>, 
           <span style="color: green; font-weight: bold;">Name:</span> <span style="background-color: yellow; color: black;">${part.description}</span>, 
           <span style="color: green; font-weight: bold;">Qty:</span> <span style="color: red;">${part.part_qty}</span>`
        ).join('<br>')
        : "-";

      

      // Construct the table row HTML
      const row = `
        <tr data-defect-id="${item.defect_id}">
          <td>${item.unit_number || "-"}</td>
          <td>
            ${item.defect_description || "-"}
            ${item.motive_defect_notes ? `<br><small class="text-muted">Note: ${item.motive_defect_notes}</small>` : ""}
          </td>
          <td>${item.defect_captured_date || "-"}</td>
          
          <td>${item.repair_date || "-"}</td>
          <td>${item.estimated_hours || "-"}</td>
          <td>${item.mechanic || "-"}</td>
          <td>${item.kilometers || "-"}</td>
          <td>${item.actual_time || "-"}</td>
       
<td>
  ${
    Array.isArray(item.mechanic_repair_notes)
      ? `<ul style="padding-left: 16px; margin: 0;">` +
        item.mechanic_repair_notes.map(n => `
          <li><strong>${n.mechanic_name || 'Unknown'}:</strong> ${n.note || ''}</li>
        `).join('') +
        `</ul>`
      : "-"
  }
</td>


          <td>${partsUsedStr}</td>
          <td>${partsNeededStr}</td>
          <td>${item.status || "-"}</td>
          <td class="text-center">
            <i class="fas fa-edit text-success action-icon" style="cursor: pointer;" data-defect-id="${item.defect_id}" title="Edit Task"></i>
          </td>
          <td class="approval-cell">
            <select class="status-dropdown form-select form-select-sm">
             <option value="">Select</option>
              <option value="Not Scheduled">Not Scheduled</option>
              <option value="Partially Completed">Partially Completed</option>
              <option value="Completed">Completed</option>
            </select>
          </td>
        
        </tr>
      `;
      tableBody.append(row);
    });

    // Hide approval column if user's role is not allowed
    if (!allowedRoles.includes(currentUserRole)) {
      document.getElementById("hideColumn").style.display = "none";
      document.querySelectorAll(".approval-cell").forEach(cell => {
        cell.style.display = "none";
      });
    }
    else {
        document.getElementById("hideColumn").style.display = "";
    }

    // Initialize DataTable
    const table = $('#dataTable').DataTable({
      order: [[2, 'desc']], // Sort by estimated time or date
      searching: true,
      responsive: true
    });

    /*****************************************
     * Filtering & Reset Logic for Search Inputs
     *****************************************/
    $('#unitNumber').on('keyup', function () {
      table.search(this.value).draw();
    });

    $('#defectDescription').on('keyup', function () {
      table.search(this.value).draw();
    });

  $('#statusFilter').on('change', function () {
  const selectedStatus = this.value;
  const columnIndex = 11; // adjust if "Status" is at a different position
  const table = $('#dataTable').DataTable();

  if (selectedStatus) {
    // Match exactly using regex
    table.column(columnIndex)
         .search('^' + selectedStatus + '$', true, false)
         .draw();
  } else {
    // If empty (e.g., "All"), clear the search
    table.column(columnIndex).search('').draw();
  }
});

$('#recordedBySelect').on('change', function () {
  const selectedMechanic = this.value;
  const columnIndex = 5; // "Mechanic" column index
  const table = $('#dataTable').DataTable();

  table.column(columnIndex).search(selectedMechanic).draw();
});



    $('#recordedByInput').on('keyup', function () {
      table.search(this.value).draw();
    });

 $('#recordedDate').on('change', function () {
  const val = this.value;
  const columnIndex = 2; // Make sure this matches the "Captured Date" column

  if (!val) {
    table.column(columnIndex).search('').draw();
  } else {
    table.column(columnIndex).search('^' + val + '$', true, false).draw();
   // alert( table.column(columnIndex).search('^' + val + '$', true, false).draw());
  }
});



    $('#resetFiltersBtn').on('click', function () {
  const table = $('#dataTable').DataTable();

  // Clear global search
  table.search('').draw();

  // Clear column-specific filters
  table.columns().search('');

  // Redraw table
  table.draw();

  // Reset form fields
  $('#defectForm')[0].reset();
});


  } catch (error) {
    console.error("Error loading defect data:", error);
  }
}

/****************Calling this Data Table LoadDefect Function After User is Authenticated *****************************************/

/***************************************** Edit Task Pop view************************************************************* */
/// EDIT BUTTON HANDLER
$(document).on('click', '.action-icon', async function () {
 
  const defectId = $(this).data('defect-id');
  

  
  if (!defectId) return;
 


  try {
    const querySnapshot = await firebase.firestore()
      .collection("allDefects")
      .where("defect_id", "==", defectId)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      alert("Defect not found.");
      return;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
// Call renderPreviousMechanicNotes here to display previous notes if any
renderPreviousMechanicNotes(data.mechanic_repair_notes);

    let repairDateValue = '';

if (data.repair_date) {
  if (typeof data.repair_date === 'object' && typeof data.repair_date.toDate === 'function') {
    // Firestore Timestamp
    repairDateValue = data.repair_date.toDate().toISOString().split('T')[0]; // YYYY-MM-DD
  } else if (typeof data.repair_date === 'string') {
    // Assume stored as MM-DD-YYYY string, convert to YYYY-MM-DD
    const parts = data.repair_date.split('-'); // ["MM", "DD", "YYYY"]
    if (parts.length === 3) {
      const [month, day, year] = parts;
      repairDateValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
}


    $('#editDefectId').val(defectId);
    $('#editRepairDate').val(repairDateValue);
    $('#editUnitNumber').val(data.unit_number || '');
    $('#editEstimatedTime').val(data.estimated_hours || '');
    $('#editMechanic').val(data.mechanic || '');
    $('#editIssue').val(data.defect_description || '');
    $('#editActualTime').val(data.actual_time || '');
    $('#editKM').val(data.kilometers || '');
    $('#editStatus').val(data.status || '');
    //$('#mechanicNoteInput').val('');

   

    // Lock Fields
    $('#editRepairDate, #editUnitNumber, #editEstimatedTime, #editIssue').prop('readonly', true);
    $('#editMechanic').prop('disabled', true);
    $('#defectIdLabel').text(defectId);

    
 // 🔧 Parts Used Section
$('#partsUsedBody').empty();

const partsUsedArray = data.parts_used || [];

if (partsUsedArray.length > 0) {
  $('#viewColumnHeader').show(); // Show column header
} else {
  $('#viewColumnHeader').hide(); // Hide if empty
}
for (const [index, part] of (data.parts_used || []).entries()) {
const isPrivilegedUser = ['Admin', 'supervisor'].includes(currentUserRole);
const isExistingPart = part.part_qty && part.part_qty > 0;
const isEditable = isPrivilegedUser && isExistingPart;
  
    
  const row = $(`
    <tr>
      <td>
        <input type="hidden" class="part-id" value="${part.id || ''}">
        <input type="text" name="partNumber" class="form-control part-number" value="${part.partNumber || ''}" readonly>
      </td>
      <td>
        <input type="text" name="partName" class="form-control part-name" value="${part.description || ''}" readonly>
      </td>
     <td>
      <input type="number" name="partQty" class="form-control part-qty" 
        value="${part.part_qty || 0}" min="1" ${!isEditable ? 'readonly' : ''}>
      <div class="qty-alert text-red-600 text-sm mt-1 hidden"></div>
    </td>
     
     <td class="approval-cell">
      ${isPrivilegedUser ? `
        <button type="button" class="btn btn-sm btn-danger" onclick="removePartsRow(this)" title="Remove Part">
          <i class="fas fa-trash"></i>
        </button>` : ''
      }
    </td>
    </tr>
    
  `);
  /* <td>
        <button type="button" class="btn btn-sm btn-info me-1" title="View Details" onclick='showPartDetailPopup(${JSON.stringify(part)})'>
          <i class="fas fa-eye"></i>
        </button>
      </td>
      */
  $('#partsUsedBody').append(row);
       
   
  
}

// Trigger validation if any part quantity is modified
$('#partsUsedBody').on('input', '.part-qty', async function () {
  await validatePartsUsedQuantitiesWithInventory('#partsUsedBody');
});

// 📦 Parts to be Ordered Section
$('#partsOrderBody').empty();

const partsNeededArray = data.parts_needed || [];

if (partsNeededArray.length > 0) {
  $('#viewColumnHeader').show(); // Show column header
} else {
  $('#viewColumnHeader').hide(); // Hide if empty
}
(data.parts_needed || []).forEach(part => {
  $('#partsOrderBody').append(`
    <tr>
      <td>
        <input type="hidden" class="part-id" value="${part.id || ''}">
        <input type="text" name="partNumber" class="form-control part-number" value="${part.partNumber || ''}">
      </td>
      <td>
        <input type="text" name="partName" class="form-control part-name" value="${part.description || ''}">
      </td>
      <td>
        <input type="number" name="partQty" class="form-control part-qty" value="${part.part_qty || 0}">
      </td>
      
 <td class="approval-cell">
          <button type="button" class="btn btn-sm btn-danger" onclick="removePartsRow(this)" title="Remove Part">
          <i class="fas fa-trash"></i>
        </button>
     
      </td>
    </tr>
  `);
    /*<td>
        <button type="button" class="btn btn-sm btn-info me-1" title="View Details" onclick='showPartDetailPopup(${JSON.stringify(part)})'>
          <i class="fas fa-eye"></i>
        </button>
         </td>*/
  
});


$('#editDefectModal').modal('show');
// 💥 Prevent Enter from auto-submitting
$('#editDefectModal input').on('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    return false;
  }
});


  } catch (error) {
    console.error("Error loading defect:", error);
    alert("Failed to load defect details.");
  }
});


/***************************************** Edit Task Pop view************************************************************* */



/***************************************** Start of Add parts functionality  ************************************************************* */
  
// Generate a unique part ID
function generatePartId() {
  return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

// Add parts row to the given table
async function addPartsRow(tableBodyId) {
  const tbody = document.getElementById(tableBodyId);
  const newRow = document.createElement('tr');
    const uniqueId = generatePartId(); // ✅ Generate a unique ID here

  newRow.innerHTML = `
   
   <td>
   <input type="hidden" class="part-id" value="${uniqueId}">
  <input type="text" name="partNumber" class="form-control part-number" placeholder="Enter Part #" required />
</td>
<td>
  <input type="text" name="partName" class="form-control part-name" placeholder="Enter Part Name" required />
</td>
<td>
  <input type="number" name="partQty" class="form-control part-qty" min="1" value="1" required />
  <div class="qty-alert text-red-600 text-sm mt-1 hidden"></div>
</td>
<td>
  <button type="button" class="btn btn-sm btn-danger" onclick="removePartsRow(this)" title="Remove Part">
    <i class="fas fa-trash"></i>
  </button>
</td>

  `;

  const partQtyInput = newRow.querySelector('.part-qty');

  if (tableBodyId === 'partsUsedBody') {
    // 📦 Validate quantity on input change
    partQtyInput.addEventListener('input', async () => {
      await validatePartsUsedQuantitiesWithInventory(`#${tableBodyId}`);
    });
  }

  tbody.appendChild(newRow);
  attachPartNumberHandler(newRow, tableBodyId);
}

//////////////////////////////////////////////////////////////////////////////////////////

function attachPartNumberHandler(row, tableBodyId) {
  const partNumberInput = row.querySelector('.part-number');
  const partNameInput = row.querySelector('.part-name');
  const partQtyInput = row.querySelector('.part-qty');
  const alertBox = row.querySelector('.qty-alert');

  if (!partNumberInput || !partNameInput || !partQtyInput || !alertBox) return;

  let lookupTimeout;
  partNumberInput.addEventListener('input', () => {
    clearTimeout(lookupTimeout);
    lookupTimeout = setTimeout(async () => {
      const partNumber = partNumberInput.value.trim();
      if (!partNumber) return;

      const partDetails = await fetchPartDetailsFromFirestore(partNumber);

      if (partDetails) {
        partNameInput.value = partDetails.description || '';
        partQtyInput.setAttribute('title', `Available: ${partDetails.partsOnHand}`);
        partQtyInput.dataset.availableQty = partDetails.partsOnHand;
        alertBox.classList.add('hidden');
      } else {
        alertBox.innerText = `Part not found in inventory. You can still proceed.`;
        alertBox.classList.remove('hidden');
        partQtyInput.removeAttribute('title');
        partQtyInput.dataset.availableQty = 0;
        partNameInput.value = 'part not found';
      }

      if (tableBodyId === 'partsUsedBody') {
        await validatePartsUsedQuantitiesWithInventory(`#${tableBodyId}`);
      }
    }, 500);
  });

  if (tableBodyId === 'partsUsedBody') {
    partQtyInput.addEventListener('input', async () => {
      await validatePartsUsedQuantitiesWithInventory(`#${tableBodyId}`);
    });
  }
}

  /////////////////////////////////////////////////////////////////////////////////////////////////////

async function validatePartsUsedQuantitiesWithInventory(tableSelector) {
  const rows = document.querySelectorAll(`${tableSelector} tr`);
  let allValid = true;
  const partQtyMap = new Map(); // Store available qty for real-time checking

  for (const row of rows) {
    const partNumberInput = row.querySelector('input.part-number');
    const partQtyInput = row.querySelector('input.part-qty');
    const alertBox = row.querySelector('.qty-alert');

    if (!partNumberInput || !partQtyInput) continue;

    const partNumber = partNumberInput.value.trim();
    const enteredQty = parseInt(partQtyInput.value) || 0;

    if (!partNumber || enteredQty <= 0) continue;

    const partDetails = await fetchPartDetailsFromFirestore(partNumber);
    const availableQty = partDetails ? parseInt(partDetails.partsOnHand || 0) : null;
    partQtyMap.set(partNumber, availableQty); // Save for real-time use

    // Over-limit check
    if (availableQty !== null && enteredQty > availableQty) {
      partQtyInput.classList.add('border-yellow-500');
      alertBox.innerText = `⚠️ Only ${availableQty} in stock. Proceeding may result in negative inventory.`;
      alertBox.classList.remove('hidden');
    } else {
      partQtyInput.classList.remove('border-red-500', 'border-yellow-500');
      alertBox.classList.add('hidden');
    }

    // Real-time input listener for over-limit correction
    partQtyInput.addEventListener('input', function () {
      const currentQty = parseInt(this.value) || 0;
      const allowedQty = partQtyMap.get(partNumber);

      if (allowedQty !== null && currentQty <= allowedQty) {
        this.classList.remove('border-yellow-500');
        alertBox.classList.add('hidden');
      } else if (allowedQty !== null && currentQty > allowedQty) {
        this.classList.add('border-yellow-500');
        alertBox.innerText = `⚠️ Only ${allowedQty} in stock. Proceeding may result in negative inventory.`;
        alertBox.classList.remove('hidden');
      }
    });
  }

  return allValid;
}


// 🔎 Firestore lookup for part details
async function fetchPartDetailsFromFirestore(partNumber) {
  try {
    const querySnapshot = await firebase.firestore()
      .collection('partsInventory')
      .where('partNumber', '==', partNumber)
      .limit(1)
      .get();

    if (querySnapshot.empty) return null;

    const data = querySnapshot.docs[0].data();
    return {
      description: data.description || '',
      partsOnHand: data.partsOnHand || 0
    };
  } catch (error) {
    console.error('Error fetching part details:', error);
    return null;
  }
}

// 🧽 Row remover
/*function removePartsRow(button) {
  const row = button.closest('tr');
  if (row) row.remove();
}
  */



async function removePartsRow(button) {
  const row = button.closest('tr');
  if (!row) return;

  const partId = row.querySelector('.part-id')?.value?.trim();
  const partNumber = row.querySelector('.part-number')?.value?.trim();
  const partQty = parseInt(row.querySelector('.part-qty')?.value || '0', 10);
  const defectId = $('#editDefectId').val();

  if (!defectId || !partId) {
    console.warn("Missing defect ID or part ID");
    row.remove();
    return;
  }

  try {
    const defectSnap = await firebase.firestore()
      .collection("allDefects")
      .where("defect_id", "==", defectId)
      .limit(1)
      .get();

    if (defectSnap.empty) {
      console.warn("Defect document not found.");
      row.remove();
      return;
    }

    const docRef = defectSnap.docs[0].ref;
    const docData = defectSnap.docs[0].data();

    const isFromPartsUsed = row.closest('#partsUsedBody') !== null;
    const isFromPartsOrder = row.closest('#partsOrderBody') !== null;

    if (isFromPartsUsed) {
      // 🔧 Remove from parts_used and update inventory
      const partsUsed = docData.parts_used || [];
      const updatedPartsUsed = partsUsed.filter(part => part.id !== partId);

      await docRef.update({ parts_used: updatedPartsUsed });

      // ✅ Adjust inventory (add quantity back)
      if (partNumber && partQty > 0) {
        const partSnap = await firebase.firestore()
          .collection("partsInventory")
          .where("partNumber", "==", partNumber)
          .limit(1)
          .get();

        if (!partSnap.empty) {
          const partDoc = partSnap.docs[0];
          const partData = partDoc.data();
          const updatedQty = (partData.partsOnHand || 0) + partQty;

          const minQty = partData.min_quantity || 0;
          const maxQty = partData.max_quantity || 0;
          const quantityToOrder = updatedQty < minQty ? maxQty - updatedQty : 0;

          await partDoc.ref.update({
            partsOnHand: updatedQty,
            quantity_to_order: quantityToOrder
          });
        }
      }

    } else if (isFromPartsOrder) {
      // 📦 Only remove from parts_needed
      const partsNeeded = docData.parts_needed || [];
      const updatedPartsNeeded = partsNeeded.filter(part => part.id !== partId);

      await docRef.update({ parts_needed: updatedPartsNeeded });

      console.log(`✅ Removed part ID ${partId} from parts_needed.`);
    }

    row.remove(); // Finally, remove row from UI

  } catch (error) {
    console.error("❌ Error removing part:", error);
    alert("Failed to remove part. Please try again.");
  }
}



/***************************************** End of Add parts functionality  ************************************************************* */


/***************************************** Start of Updating Day planner details to Firestore  ************************************************************* */
// Edit Defect Form Submission Handler
$('#editDefectForm').on('submit', async function (e) {
   e.preventDefault(); 

  const defectId = $('#editDefectId').val();
  if (!defectId) {
    alert("Invalid Defect ID");
    return;
  }

  const mechanicNotes = $('#mechanicNoteInput').val();
  const mechanicName = $('#editMechanic').val();

  const updateData = {
    actual_time: parseFloat($('#editActualTime').val()) || 0,
    kilometers: $('#editKM').val(),
    status: $('#editStatus').val(),
    maintenance_repair_needed: $('#editIssue').val(),
    status_value_updated: $('#editStatus').val(),
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  };

  function generateId() {
    return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  }

  // Parts Used
  const partsUsed = [];
  $('#partsUsedBody tr').each(function () {
    let partId = $(this).find('input.part-id').val();
    if (!partId) {
      partId = generateId();
      $(this).find('input.part-id').val(partId);
    }

    const partNumber = $(this).find('input.part-number').val();
    const partName = $(this).find('input.part-name').val();
    const partQty = parseInt($(this).find('input.part-qty').val()) || 0;

    if (partNumber || partName || partQty) {
      partsUsed.push({
        defect_id: defectId,
        id: partId,
        partNumber,
        description: partName,
        part_qty: partQty,
        mechanic: mechanicName,
        repairDate: $('#editRepairDate').val(),
        mechanicNotes,
        actualTime: $('#editActualTime').val(),
        maintenanceRepairNeeded: $('#editIssue').val(),
        kilometers: $('#editKM').val()
      });
    }
  });

  // Parts Needed
  const partsNeeded = [];
  $('#partsOrderBody tr').each(function () {
    let partId = $(this).find('input.part-id').val();
    if (!partId) {
      partId = generateId();
      $(this).find('input.part-id').val(partId);
    }

    const partNumber = $(this).find('input.part-number').val();
    const partName = $(this).find('input.part-name').val();
    const partQty = parseInt($(this).find('input.part-qty').val()) || 0;

    if (partNumber || partName || partQty) {
      partsNeeded.push({
        defect_id: defectId,
        id: partId,
        partNumber,
        description: partName,
        part_qty: partQty,
        mechanic: mechanicName,
        repairDate: $('#editRepairDate').val(),
        mechanicNotes,
        actualTime: $('#editActualTime').val(),
        maintenanceRepairNeeded: $('#editIssue').val(),
        kilometers: $('#editKM').val()
      });
    }
  });

  try {
    const querySnapshot = await firebase.firestore()
      .collection("allDefects")
      .where("defect_id", "==", defectId)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      alert("Defect not found.");
      return;
    }

    const doc = querySnapshot.docs[0];
    const docRef = doc.ref;
    const existingData = doc.data();

    const existingPartsUsed = existingData.parts_used || [];
    const existingPartsNeeded = existingData.parts_needed || [];
    const existingMechanicNotes = existingData.mechanic_repair_notes || [];

   const mergedMechanicNotes = [...existingMechanicNotes, ...newMechanicNotes];

    // Update part_qty of existing parts
    const updatedPartsUsed = existingPartsUsed.map(existing => {
      const match = partsUsed.find(p => p.id === existing.id);
      return match ? { ...existing, part_qty: match.part_qty } : existing;
    });

    // Add new parts
    const newPartsUsed = partsUsed.filter(
      newPart => !existingPartsUsed.some(existing => existing.id === newPart.id)
    );

    const finalPartsUsed = [...updatedPartsUsed, ...newPartsUsed];

    const newPartsNeeded = partsNeeded.filter(
      newPart => !existingPartsNeeded.some(existing => existing.id === newPart.id)
    );

    const mergedPartsNeeded = [...existingPartsNeeded, ...newPartsNeeded];

    await docRef.update({
      ...updateData,
      parts_used: finalPartsUsed,
      parts_needed: mergedPartsNeeded,
      mechanic_repair_notes: mergedMechanicNotes
    });

    // Update Inventory Quantities
    for (const part of partsUsed) {
      const partSnapshot = await firebase.firestore()
        .collection("partsInventory")
        .where("partNumber", "==", part.partNumber)
        .limit(1)
        .get();

      if (!partSnapshot.empty) {
        const partDoc = partSnapshot.docs[0];
        const partData = partDoc.data();

        const previousQtyUsed = (existingPartsUsed.find(p => p.id === part.id)?.part_qty) || 0;
        const currentQtyUsed = part.part_qty;
        const quantityDifference = currentQtyUsed - previousQtyUsed;

        const currentStock = partData.partsOnHand || 0;
        const minQty = partData.min_quantity || 0;
        const maxQty = partData.max_quantity || 0;

        const updatedQty = currentStock - quantityDifference;

        let quantityToOrder = 0;
        if (updatedQty < minQty) {
          quantityToOrder = maxQty - updatedQty;
        }

        await partDoc.ref.update({
          partsOnHand: updatedQty,
          quantity_to_order: quantityToOrder
        });
      }
    }

    alert("Defect updated successfully.");
    $('#editDefectModal').modal('hide');
    loadDefects();

  } catch (error) {
    console.error("Error updating defect:", error);
    alert("Failed to update defect.");
  }
});


/***************************************** End of Updating Day planner details to Firestore  ************************************************************* */

// On change of status dropdown, update Firestore status & refresh table row
//***************************************************//
// 🛠️ Handle status change and update Firestore with SweetAlert
$(document).on('change', '.status-dropdown', async function () {
  const newStatus = $(this).val();
  const row = $(this).closest('tr');
  const defectId = row.data('defect-id');

  if (!defectId) {
    console.error("Missing defect ID for status update.");
    return;
  }

  const statusMessages = {
    "Not Scheduled": "This defect will be marked as 'Not Scheduled'.",
    "Scheduled": "This defect is now scheduled for repair.",
    "In Progress": "This defect is marked as 'Partially Completed'.",
    "Completed": "This defect has been completed."
  };

  const confirmResult = await Swal.fire({
    title: 'Confirm Status Update',
    text: statusMessages[newStatus] || `Update status to "${newStatus}"?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, update it',
    cancelButtonText: 'Cancel'
  });

  if (!confirmResult.isConfirmed) return;

  try {
    const defectQuery = await firebase.firestore()
      .collection('allDefects')
      .where('defect_id', '==', defectId)
      .limit(1)
      .get();

    if (defectQuery.empty) {
      await Swal.fire('Error', 'Defect not found in the database.', 'error');
      return;
    }
  const currentDate = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const defectDocRef = defectQuery.docs[0].ref;

    await defectDocRef.update({
      status: newStatus,
      updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      manager_approval_status : newStatus,
      manager_approval_date: currentDate
    });

    await Swal.fire('Status Updated', `Defect status changed to "${newStatus}".`, 'success');
    location.reload();

  } catch (error) {
    console.error("Error updating status:", error.message, error.stack);
    await Swal.fire('Error', 'Failed to update defect status.', 'error');
  }
});
//***************************************************//

function showPartDetailPopup(part) {
  const modalBody = document.getElementById("partDetailBody");

  const partNumber = part.partNumber || "-";
  const description = part.description || "-";
  const part_qty = part.part_qty || "-";

  const mechanic = part.mechanic || "-";
  const repairDate = part.repairDate || "-";
  const actualTime = part.actualTime ? `${part.actualTime} hrs` : "-";
  const repairNeeded = part.maintenanceRepairNeeded || "-";
  const note = part.mechanicNotes || "-";
  const kilometers = part.kilometers !== undefined && part.kilometers !== null ? `${part.kilometers} km` : "-";

  modalBody.innerHTML = `
    <div class="mb-3">
      
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead class="table-light">
            <tr>
              <th>Part Number</th>
              <th>Part Name</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${partNumber}</td>
              <td>${description}</td>
              <td>${part_qty}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="border-top pt-3">
      <div class="mb-2"><i class="fas fa-user-cog me-1 text-primary"></i><strong>Mechanic:</strong> ${mechanic}</div>
      <div class="mb-2"><i class="fas fa-calendar-alt me-1 text-success"></i><strong>Repaired Date:</strong> ${repairDate}</div>
      <div class="mb-2"><i class="fas fa-tachometer-alt me-1 text-secondary"></i><strong>Kilometers:</strong> ${kilometers}</div>
      <div class="mb-2"><i class="fas fa-clock me-1 text-warning"></i><strong>Actual Time:</strong> ${actualTime}</div>
      <div class="mb-3"><i class="fas fa-tools me-1 text-danger"></i><strong>Repair Needed:</strong><br>${repairNeeded}</div>
      <div><i class="fas fa-sticky-note me-1 text-info"></i><strong>Mechanic Notes:</strong><br>${note}</div>
    </div>
  `;

const detailModal = new bootstrap.Modal(document.getElementById("partDetailModal"), {
  backdrop: 'static',
  keyboard: false,
  focus: false  // Prevent realignment of parent modal
});
detailModal.show();


// Keep parent modal scroll lock
document.body.classList.add('modal-open');
}

