/*****************************************Global Variable************************************************************* */

let editingLocked = true;  // Controls whether editing is locked or unlocked

let isInputActive = false; // 🔧 Add this line


/*****************************************Global Variable************************************************************* */


/*****************************************
 * Initialization of User Authentication
 *****************************************/
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
        // Set global role variable
        currentUserRole = role;

        // Update UI with user's name and role
        $('#userFirstName').text(firstName);
        $('#userRoleDisplay').html(role);

        // Show/hide menu items based on role
        if (role === 'Mechanic') {
          $('#userManagementMenuItem').hide();
          $('#partsInventoryMenuItem').hide();
        } else {
          $('#userManagementMenuItem').show();
          $('#partsInventoryMenuItem').show();
        }

        // Load defects data for authorized user
        console.log("Calling loadVehicles...");
        loadVehicles();

      } else {
        alert("User profile not found.");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  });
});

/*************************** Start Lock and Unlock Button functionality*************************************/

/*************************** Start Lock and Unlock Button functionality*************************************/

document.getElementById("editLockToggle").addEventListener("click", () => {
  editingLocked = !editingLocked;
  document.getElementById("lockIcon").textContent = editingLocked ? '🔒' : '🔓';

  // Toggle contenteditable on all editable cells
  document.querySelectorAll('.editable').forEach(cell => {
    cell.setAttribute('contenteditable', !editingLocked);
  });
});

/***************************End Lock and Unlock Button functionality*************************************/


/***************************End Lock and Unlock Button functionality*************************************/

/*****************************************
 * Load Vehicles and Render Editable Table
 *****************************************/

async function loadVehicles() {
  if ($.fn.DataTable.isDataTable('#vehiclesTable')) {
    $('#vehiclesTable').DataTable().clear().destroy();
  }

  const tableBody = $('#vehiclesTableBody');
  tableBody.empty();

  try {
    const [vehicleSnap, motiveSnap] = await Promise.all([
      firebase.firestore().collection('vehicles').get(),
      firebase.firestore().collection('motiveVehicles').get()
    ]);

    const vehiclesMap = new Map(
      vehicleSnap.docs.map(doc => {
        const data = doc.data();
        const unit = String(data.unit_ || data.unit || '').trim();
        return [unit, { id: doc.id, ...data }];
      })
    );

    const motiveData = motiveSnap.docs.map(doc => doc.data());

    const mergedVehicles = motiveData.map(motive => {
      const unitStr = String(motive.number).trim();
      const matched = vehiclesMap.get(unitStr);

      return matched
        ? {
            ...matched,
            unit_: motive.number,
            current_kilometers: motive.odometer
          }
        : {
            id: null,
            unit_: motive.number,
            current_kilometers: motive.odometer,
            next_schedule_4: null,
            bimonthly_inspection: null,
            semiannual_inspection_sticker: null,
            next_engine_oil_change: null,
            next_transmission_oil_change_250k_km: null,
            next_power_steering_oil_change: null,
            next_differntial_oil_change: null,
            next_def_filter: null,
            next_air_dryer_change: null
          };
    });

    mergedVehicles.sort((a, b) => (a.unit_ || 0) - (b.unit_ || 0));

    const formatNumber = num => (typeof num === 'number' ? num.toLocaleString() : '-');
    const formatDate = strDate => {
      if (!strDate || typeof strDate !== 'string') return '-';
      const parts = strDate.split('-');
      return parts.length === 3 ? `${parts[0]}/${parts[1]}/${parts[2]}` : strDate;
    };

    mergedVehicles.forEach(vehicle => {
      const row = `
        <tr data-doc-id="${vehicle.id || ''}">
          <td contenteditable="false" class="editable" data-type="number" data-field="unit_">${vehicle.unit_ || '-'}</td>
          <td contenteditable="false" class="editable" data-type="number" data-field="current_kilometers">${formatNumber(vehicle.current_kilometers)}</td>
          <td contenteditable="false" class="editable" data-type="date" data-field="next_schedule_4">${formatDate(vehicle.next_schedule_4)}</td>
          <td contenteditable="false" class="editable" data-type="date" data-field="bimonthly_inspection">${formatDate(vehicle.bimonthly_inspection)}</td>
          <td contenteditable="false" class="editable" data-type="date" data-field="semiannual_inspection_sticker">${formatDate(vehicle.semiannual_inspection_sticker)}</td>
          <td contenteditable="false" class="editable" data-type="number" data-field="next_engine_oil_change">${formatNumber(vehicle.next_engine_oil_change)}</td>
          <td contenteditable="false" class="editable" data-type="number" data-field="next_transmission_oil_change_250k_km">${formatNumber(vehicle.next_transmission_oil_change_250k_km)}</td>
          <td contenteditable="false" class="editable" data-type="number" data-field="next_power_steering_oil_change">${formatNumber(vehicle.next_power_steering_oil_change)}</td>
          <td contenteditable="false" class="editable" data-type="number" data-field="next_differntial_oil_change">${formatNumber(vehicle.next_differntial_oil_change)}</td>
          <td contenteditable="false" class="editable" data-type="date" data-field="next_def_filter">${formatDate(vehicle.next_def_filter)}</td>
          <td contenteditable="false" class="editable" data-type="date" data-field="next_air_dryer_change">${formatDate(vehicle.next_air_dryer_change)}</td>
        </tr>
      `;
      tableBody.append(row);
    });

    $('#vehiclesTable').DataTable({
      order: [[0, 'asc']],
      ordering: false,
      paging: false,
      scrollX: true,
      scrollCollapse: true,
      fixedHeader: true,
      searching: false,
      fixedColumns: {
        leftColumns: 2
      }
    });
  } catch (error) {
    console.error("Error loading vehicles data:", error);
    tableBody.html('<tr><td colspan="12" class="text-center text-danger">Failed to load data.</td></tr>');
  }
}


/********************** Inline Editing with Appropriate Input Types **********************/

// When user clicks an editable cell, replace cell content with an input (date or number) if unlocked
$(document).on('click', '.editable', function () {
  if (editingLocked) return; // Do nothing if locked
  if (isInputActive) return;  // Prevent multiple inputs simultaneously

  const $cell = $(this);
  const dataType = $cell.data('type');
  const originalText = $cell.text().trim();
  const field = $cell.data('field');

  // Create input type based on data-type attribute
  let inputType = 'text';  // default fallback

  if (dataType === 'date') inputType = 'date';
  else if (dataType === 'number') inputType = 'number';

  // Format date for input[type=date]
  const formatForInputDate = (dateStr) => {
  const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
};

  // Format date from YYYY-MM-DD to DD/MM/YYYY for display
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr || dateStr === '') return '-';
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  };

  // Remove existing input to avoid duplication
  $cell.empty();

  // Create the input element
  const $input = $('<input>', {
    type: inputType,
    class: 'inline-edit-input',
    value: (inputType === 'date') ? formatForInputDate(originalText) : originalText,
    min: inputType === 'number' ? 0 : undefined, // prevent negative numbers if needed
  });

  // Append input and focus
  $cell.append($input);
  $input.focus();

  isInputActive = true;

  // When input loses focus or Enter key pressed, save changes and remove input
  $input.on('blur keydown', async function (e) {
    if (e.type === 'blur' || (e.type === 'keydown' && e.key === 'Enter')) {
      e.preventDefault();

      let newValueRaw = $(this).val();
      let newValueToStore = newValueRaw;

      if (inputType === 'date') {
        // Convert YYYY-MM-DD to DD-MM-YYYY for storage
        if (newValueRaw) {
          const parts = newValueRaw.split('-');
          if (parts.length === 3) {
            newValueToStore = `${parts[2]}-${parts[1]}-${parts[0]}`; // store as DD-MM-YYYY
          }
        } else {
          newValueToStore = '';
        }
      } else if (inputType === 'number') {
        newValueToStore = newValueRaw === '' ? '' : Number(newValueRaw);
      }

      // Update Firestore
      try {
        const docId = $cell.closest('tr').data('doc-id');
        await firebase.firestore().collection('vehicles').doc(docId).update({
          [field]: newValueToStore
        });
        console.log(`✅ Updated ${field} in ${docId} to`, newValueToStore);
      } catch (error) {
        console.error("❌ Firestore update failed:", error);
        alert('Failed to save data, please try again.');
      }

      // Update cell text with formatted display value
      if (inputType === 'date') {
        $cell.text(formatDateForDisplay(newValueToStore));
      } else if (inputType === 'number') {
        $cell.text(newValueToStore === '' ? '-' : newValueToStore.toLocaleString());
      } else {
        $cell.text(newValueToStore);
      }

      isInputActive = false;
    }
  });

});

// You can optionally add a global click handler to save input if user clicks outside, but this is sufficient for now.
