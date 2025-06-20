/*****************************************Global Variable************************************************************* */

let currentUserRole = '';

/*****************************************Global Variable************************************************************* */

/*****************************************Mechanic Dropdown view logics************************************************************* */
// Show the modal
function handleRecordedByChange(selectElement) {
  const inputField = document.getElementById("recordedByInput");
  if (selectElement.value === "Other") {
    inputField.style.display = "block";
    inputField.setAttribute("required", "required");
  } else {
    inputField.style.display = "none";
    inputField.removeAttribute("required");
  }
}
/*****************************************Mechanic Dropdown view logics************************************************************* */

 /*****************************************Intialization of User Authentication************************************************************* */
   $(document).ready(function () {
  firebase.auth().onAuthStateChanged(async (user) => {
    
    if (!user) {
      window.alert("🚫 You are not authorized to view this page.");
      window.location.href = "/index.html";
      return;
    }

    const currentUID = user.uid;
    //console.log(currentUID);

    try {
      const querySnapshot = await firebase.firestore()
        .collection('users')
        .where('FirestoreUserAuthID', '==', currentUID)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const userData = doc.data();
        const role = userData.Role;
        currentUserRole = userData.Role;
      //  console.log(currentUserRole); 
        const firstName = userData.FirstName || "User";

        $('#userFirstName').text(firstName);
        $('#userRoleDisplay').html(role);

        if (role === 'Mechanic') {
          $('#userManagementMenuItem').hide();
           $('#editCheckedBtn').hide();
           $('#saveCheckedBtn').hide();
           $('#sendToDayPlannerBtn').hide();
             $('#partsInventoryMenuItem').hide();
                $('#whiteboardMenuItem').hide();
                  $('#userManagementDivider').hide();
              $('#partsInventroyDivider').hide();
               $('#whiteboardDivider').hide();
        } else {
          $('#userManagementMenuItem').show();
          $('#editCheckedBtn').show();
  $('#saveCheckedBtn').show();
            $('#partsInventoryMenuItem').show();
             $('#whiteboardMenuItem').show();
              $('#userManagementDivider').show();
              $('#partsInventroyDivider').show();
               $('#whiteboardDivider').show();
  
        }

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


/****************************************Calling this Data Table LoadDefect Function After User is Authenticated************************************************************* */

/***************************************** START: Load Defects into DataTable *************************************************************/
async function loadDefects() {

  /************ START: Show/Hide Edit Column Based on Role ************/
  const allowedRoles = ['Admin', 'Supervisor'];
  console.log("Current Role:", currentUserRole);
  if (!allowedRoles.includes(currentUserRole)) {
    document.getElementById('hideColumn').style.display = 'none';
  }
  /************ END: Show/Hide Edit Column Based on Role ************/

  console.log("loadDefects working");

  // Destroy existing DataTable instance if exists
  if ($.fn.DataTable.isDataTable('#dataTable')) {
    $('#dataTable').DataTable().clear().destroy();
  }

  const tableBody = $('#defect-table-body');
  tableBody.empty();

  try {
    const snapshot = await firebase.firestore().collection("allDefects").get();

    // Map Firestore data
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort data by captured_date DESC (assuming YYYY-MM-DD format in DB)
    data.sort((a, b) => {
      const dateA = a.defect_captured_date || "";
      const dateB = b.defect_captured_date || "";
      return dateB.localeCompare(dateA); // Descending
    });

    // Generate table rows
    data.forEach(item => {
      const checkboxColumn = (['Admin', 'Supervisor'].includes(currentUserRole))
        ? `<td><input type="checkbox" class="edit-checkbox" /></td>`
        : '';

      const row = `
        <tr data-doc-id="${item.id}" data-defect-id="${item.defect_id}">
          <td>${item.unit_number || "-"}</td>
          <td>
            ${item.defect_description || "-"}
            ${item.motive_defect_notes ? `<br><small class="text-muted">Note: ${item.motive_defect_notes}</small>` : ""}
          </td>
          <td>${formatDateMMDDYYYY(item.defect_captured_date)}</td>
          <td>${item.defect_captured_by || "-"}</td>
          <td>${item.estimated_hours || "-"}</td>
          <td>${item.mechanic || "-"}</td>
          <td>${formatDateMMDDYYYY(item.repair_date)}</td>
          <td>${item.status || "-"}</td>
          ${checkboxColumn}
          <td>${item.motive_record_id || "-"}</td>
          <td>${item.motive_defect_id || "-"}</td>
          <td>${item.defect_id || "-"}</td>
          <td>${item.motive_defect_status || "-"}</td>
          <td>${item.trigger || "-"}</td>
          <td><button class="btn btn-sm btn-danger delete-defect-btn mt-1">🗑️</button></td>
        </tr>
      `;
      tableBody.append(row);
    });

    /************ START: Initialize DataTable with Status Filter ************/
    const table = $('#dataTable').DataTable({
      order: [[2, 'desc']],
      searching: true,
      fixedHeader: true
    });

    const statusFilter = $(`
      <label class="ml-2">Status: 
        <select id="statusFilter" class="form-control form-control-sm ml-2" style="width: auto; display: inline-block;">
          <option value="">All</option>
          <option value="Need Parts">Need Parts</option>
          <option value="Not Scheduled">Not Scheduled</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Not Completed">Not Completed</option>
        </select>
      </label>
    `);

    $('#dataTable_filter').prepend(statusFilter);

    $('#statusFilter').on('change', function () {
      const selectedStatus = $(this).val();
      table.column(7).search(selectedStatus ? '^' + selectedStatus + '$' : '', true, false).draw();
    });
    /************ END: Initialize DataTable with Status Filter ************/

    /************ START: Form Input Event Listeners for Filtering ************/
    $('#unitNumber').on('keyup', function () {
      table.search(this.value).draw();
    });
    $('#defectDescription').on('keyup', function () {
      table.search(this.value).draw();
    });
    $('#recordedBySelect').on('change', function () {
      table.search(this.value).draw();
    });
    $('#recordedByInput').on('keyup', function () {
      table.search(this.value).draw();
    });

    $('#resetEditBtn').on('click', function () {
      table.search('').draw();
      $('#defectForm')[0].reset();
    });

    $('#recordedDate').on('change', function () {
      const val = this.value; // "yyyy-mm-dd"
      if (!val) return;

      const parts = val.split("-");
      const formattedDate = `${parts[1]}-${parts[2]}-${parts[0]}`; // mm-dd-yyyy
      console.log("Filtering for:", formattedDate);

      const columnIndex = 2; // Captured Date column
      table.column(columnIndex).search(formattedDate).draw();
    });
    /************ END: Form Input Event Listeners for Filtering ************/

  } catch (error) {
    console.error("❌ Error loading defect data:", error);
  }
}
/***************************************** END: Load Defects into DataTable *************************************************************/


/***************************************** START: Date Formatter Utility *************************************************************/
function formatDateMMDDYYYY(date) {
  if (!date) return "-";

  try {
    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  } catch (e) {
    console.error("Invalid date passed to formatDateMMDDYYYY:", date);
    return "-";
  }
}
/***************************************** END: Date Formatter Utility *************************************************************/

 /************************* START: Edit Checked Rows Functionality *************************/
document.getElementById("editCheckedBtn").addEventListener("click", () => {
  const rows = document.querySelectorAll("#defect-table-body tr");

  rows.forEach((row, index) => {
    const isChecked = row.querySelector(".edit-checkbox")?.checked;
    console.log(`Row ${index} checked:`, isChecked);

    const estimateCell = row.children[4];
    const mechanicCell = row.children[5];
    const repairDateCell = row.children[6];

    if (isChecked) {
      // Extract current values
      const estimateValue = estimateCell.querySelector("input")?.value || estimateCell.innerText.trim();
      const mechanicValue = mechanicCell.querySelector("select")?.value || mechanicCell.innerText.trim();
      let repairDateValue = repairDateCell.querySelector("input")?.value;

      if (!repairDateValue) {
        const dateText = repairDateCell.innerText.trim();
        const parsedDate = new Date(dateText);
        if (!isNaN(parsedDate)) {
          repairDateValue = parsedDate.toISOString().split("T")[0];
        }
      }

      // Insert editable fields
      estimateCell.innerHTML = `<input type="number" min="0" step="1" class="form-control form-control-sm" value="${estimateValue}" />`;

      mechanicCell.innerHTML = `<select class="form-control form-control-sm">
        <option value="">Select</option>
        ${["Anojan", "Gobi", "Jayano", "Sanker", "Pirasanna", "Matt", "Sam", "Maurice", "Amin", "Ronald"]
          .map(name => `<option value="${name}" ${mechanicValue === name ? "selected" : ""}>${name}</option>`)
          .join("")}
      </select>`;

      repairDateCell.innerHTML = `<input type="date" class="form-control form-control-sm" value="${repairDateValue || ""}" />`;
    } else {
      // Restore display view
      const estimateValue = estimateCell.querySelector("input")?.value || estimateCell.innerText.trim();
      const mechanicValue = mechanicCell.querySelector("select")?.value || mechanicCell.innerText.trim();
      const repairDateValue = repairDateCell.querySelector("input")?.value || repairDateCell.innerText.trim();

      estimateCell.innerHTML = estimateValue;
      mechanicCell.innerHTML = mechanicValue || "-";
      repairDateCell.innerHTML = repairDateValue || "-";
    }
  });
});
/************************* END: Edit Checked Rows Functionality *************************/


/************************* START: Defect Submission Functionality *************************/
document.getElementById('defectForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const user = firebase.auth().currentUser;
  if (!user) {
    alert("User not logged in.");
    return;
  }

  // Collect input values
  const unitNumber = document.getElementById('unitNumber').value.trim();
  const description = document.getElementById('defectDescription').value.trim();
  const estimatedHours = document.getElementById('estimatedTime').value.trim();

  const mechanicSelect = document.getElementById('recordedBySelect');
  const mechanicInput = document.getElementById('recordedByInput');

  const capturedBy = mechanicSelect.value === "Other"
    ? mechanicInput.value.trim()
    : mechanicSelect.value;

  // Validation
  if (!unitNumber || !description || !estimatedHours || !capturedBy) {
    alert("⚠️ Please fill in all required fields.");
    return;
  }

  // Generate Unique ID
  const generateDefectId = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const randomDigits = Math.floor(100 + Math.random() * 900);
    return `DEF-${month}${day}${year}-${randomDigits}`;
  };

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Duplicate check
    const duplicateQuery = await firebase.firestore()
      .collection('allDefects')
      .where('unit_number', '==', unitNumber)
      .where('defect_description', '==', description)
      .where('defect_captured_by', '==', capturedBy)
      .get();

    const isDuplicate = duplicateQuery.docs.some(doc => {
      const dateStr = doc.data().defect_captured_date;
      if (!dateStr) return false;
      const docDate = new Date(dateStr);
      docDate.setHours(0, 0, 0, 0);
      return docDate.getTime() === today.getTime();
    });

    if (isDuplicate) {
      Swal.fire({
        icon: 'warning',
        title: 'Duplicate Entry',
        text: '⚠️ Defect already exists for today with the same details.',
        confirmButtonColor: '#f6c23e'
      });
      return;
    }

    // Save new defect
    const capturedDate = new Date().toISOString().split("T")[0];
    const defectId = generateDefectId();

    await firebase.firestore().collection('allDefects').add({
      defect_id: defectId,
      unit_number: unitNumber,
      defect_description: description,
      estimated_hours: estimatedHours,
      repair_date: null,
      status: "Not Scheduled",
      defect_captured_by: capturedBy,
      defect_captured_date: capturedDate,
      user_id: user.uid
    });

    Swal.fire({
      icon: 'success',
      title: 'Defect Logged',
      text: '✅ Defect successfully saved.',
      confirmButtonColor: '#4e73df'
    });

    this.reset();
    loadDefects();

  } catch (error) {
    console.error("❌ Error adding defect:", error);
    Swal.fire({
      icon: 'error',
      title: 'Save Failed',
      text: 'Failed to save defect. Check console for details.',
      confirmButtonColor: '#e74a3b'
    });
  }
});
/************************* END: Defect Submission Functionality *************************/


/*************************Start Save Edit check Functionality*********************************************/
document.getElementById("saveCheckedBtn").addEventListener("click", async () => {
  const rows = document.querySelectorAll("#defect-table-body tr");
  const batch = firebase.firestore().batch(); // Firestore batch update
  let checkedCount = 0; // Track checked rows

  for (const row of rows) {
    const isChecked = row.querySelector(".edit-checkbox")?.checked;
    if (!isChecked) continue;

    checkedCount++;

    const defectId = row.getAttribute("data-defect-id");
    const estimateInput = row.children[4].querySelector("input");
    const mechanicSelect = row.children[5].querySelector("select");
    const repairDateInput = row.children[6].querySelector("input");

    const updatedEstimate = estimateInput?.value?.trim();
    const updatedMechanic = mechanicSelect?.value?.trim();
    const repairDateStr = repairDateInput?.value;

    try {
      // Check if defect exists
      const querySnapshot = await firebase.firestore()
        .collection("allDefects")
        .where("defect_id", "==", defectId)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        await Swal.fire({
          icon: 'warning',
          title: 'Defect Not Found',
          text: `⚠️ Defect with ID: ${defectId} does not exist in database. Skipping.`,
          confirmButtonColor: '#f6c23e'
        });
        continue; // Skip this defect
      }

      // Validations
      if (!updatedEstimate) {
        await Swal.fire({
          icon: 'warning',
          title: 'Missing Field',
          text: `⚠️ Please enter Estimated Hours for defect ID: ${defectId}`,
          confirmButtonColor: '#f6c23e'
        });
        return;
      }

      if (!updatedMechanic) {
        await Swal.fire({
          icon: 'warning',
          title: 'Missing Field',
          text: `⚠️ Please select a Mechanic for defect ID: ${defectId}`,
          confirmButtonColor: '#f6c23e'
        });
        return;
      }

      if (!repairDateStr) {
        await Swal.fire({
          icon: 'warning',
          title: 'Missing Field',
          text: `⚠️ Please select a Repair Date for defect ID: ${defectId}`,
          confirmButtonColor: '#f6c23e'
        });
        return;
      }

      // Validate date format and values
      const [year, month, day] = repairDateStr.split('-').map(Number);
      if (
        !year || !month || !day ||
        isNaN(year) || isNaN(month) || isNaN(day) ||
        month < 1 || month > 12 ||
        day < 1 || day > 31
      ) {
        await Swal.fire({
          icon: 'warning',
          title: 'Invalid Date',
          text: `⚠️ Please enter a valid Repair Date for defect ID: ${defectId}`,
          confirmButtonColor: '#f6c23e'
        });
        return;
      }

      // Convert YYYY-MM-DD to MM-DD-YYYY string
      const updatedRepairDate = `${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}-${year}`;

      // Add update to batch
      const docRef = querySnapshot.docs[0].ref;
      batch.update(docRef, {
        estimated_hours: updatedEstimate,
        mechanic: updatedMechanic,
        repair_date: updatedRepairDate,  // <-- Save as string in MM-DD-YYYY
      });
    } catch (error) {
      console.error(`Error processing defect ${defectId}:`, error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `❌ Failed to process defect ID: ${defectId}. See console for details.`,
        confirmButtonColor: '#e74a3b'
      });
      return;
    }
  }

  if (checkedCount === 0) {
    await Swal.fire({
      icon: 'info',
      title: 'No Selection',
      text: 'Please select at least one defect to update.',
      confirmButtonColor: '#4e73df'
    });
    return;
  }

  try {
    await batch.commit();
    await Swal.fire({
      icon: 'success',
      title: 'Update Successful',
      text: '✅ Selected defects updated successfully!',
      confirmButtonColor: '#4e73df'
    });
    loadDefects(); // Refresh table
  } catch (error) {
    console.error("Batch update failed:", error);
    await Swal.fire({
      icon: 'error',
      title: 'Save Failed',
      text: '❌ Failed to update defects. Check console for details.',
      confirmButtonColor: '#e74a3b'
    });
  }
});
/*************************End Save Edit check Functionality*********************************************/




/******************************** start of sendToDayPlannerBtn event listener *************************************************************/
document.getElementById("sendToDayPlannerBtn").addEventListener("click", async () => {
  const rows = document.querySelectorAll("#defect-table-body tr");
  const batch = firebase.firestore().batch();

  let anyChecked = false;

  for (const row of rows) {
    const isChecked = row.querySelector(".edit-checkbox")?.checked;

    if (isChecked) {
      anyChecked = true;
      const defectId = row.getAttribute("data-defect-id");

      try {
        // Fetch updated defect directly by defect_id
        const querySnapshot = await firebase.firestore()
          .collection("allDefects")
          .where("defect_id", "==", defectId)
          .limit(1)
          .get();

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const docRef = doc.ref;
          const data = doc.data();

          const repairDate = data.repair_date;
          const assignedMechanic = data.mechanic;
          const estimatedHours = data.estimated_hours;

          if (!repairDate || !assignedMechanic || estimatedHours === null || estimatedHours === "" || estimatedHours === undefined) {
            await Swal.fire({
              icon: 'warning',
              title: `Defect ${defectId} is Incomplete`,
              html: `Please ensure the following fields are filled:<br><ul>
                <li><strong>Repair Date</strong></li>
                <li><strong>Assigned Mechanic</strong></li>
                <li><strong>Estimated Hours</strong></li></ul>`,
              confirmButtonColor: '#f6c23e'
            });
            return; // stop processing if one is invalid
          }

          // Valid - Add to batch update status to Scheduled
          batch.update(docRef, { status: "Scheduled" });

        } else {
          await Swal.fire({
            icon: 'error',
            title: 'Defect Not Found',
            text: `Defect with ID ${defectId} was not found in Firestore.`
          });
          return;
        }

      } catch (error) {
        console.error(`Error with defect ${defectId}:`, error);
        await Swal.fire({
          icon: 'error',
          title: 'Error Occurred',
          text: `Something went wrong while validating ${defectId}.`
        });
        return;
      }
    }
  }

  if (!anyChecked) {
    Swal.fire({
      icon: 'info',
      title: 'No Defect Selected',
      text: 'Please check at least one defect to send.',
      confirmButtonColor: '#4e73df'
    });
    return;
  }

  // Commit batch update
  try {
    await batch.commit();
    await Swal.fire({
      icon: 'success',
      title: 'Success',
      text: '✅ Selected defects are scheduled!',
      confirmButtonColor: '#4e73df'
    });
    loadDefects(); // Refresh data after update
  } catch (error) {
    console.error("Batch commit failed:", error);
    Swal.fire({
      icon: 'error',
      title: 'Update Failed',
      text: '❌ Could not update defects. Please try again.',
      confirmButtonColor: '#e74a3b'
    });
  }
});
/************************** end of sendToDayPlannerBtn event listener ******************************************************/

/// ========================== START: Delete Defect from allDefects ==========================

$(document).on('click', '.delete-defect-btn', async function () {
  const row = $(this).closest('tr');
  const docId = row.data('doc-id');  // Use the Firestore document ID here

  if (!docId) {
    console.error("No document ID found on this row!");
    alert("Error: Could not find record to delete.");
    return;
  }

  if (!confirm("Are you sure you want to delete this defect?")) return;

  try {
    await firebase.firestore().collection('allDefects').doc(docId).delete();
    console.log(`Deleted document with ID: ${docId}`);
    row.remove();  // Remove the row from the UI immediately
  } catch (error) {
    console.error("Error deleting document:", error);
    alert("Failed to delete record. See console for details.");
  }
});

// =========================== END: Delete Defect from allDefects ===========================
