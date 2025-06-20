/***************************************** Global Variables *****************************************/
let currentUserRole = '';
let partsData = [];
let dataTableInstance = null;

/***************************************** Authentication & User Role Init *****************************************/
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
        const doc = querySnapshot.docs[0];
        const userData = doc.data();
        const role = userData.Role;
        currentUserRole = role;
        $('#userFirstName').text(userData.FirstName || "User");
        $('#userRoleDisplay').html(role);

        if (role === 'Mechanic') {
          $('#userManagementMenuItem').hide();
          $('#partsInventoryMenuItem').hide();
        } else {
          $('#userManagementMenuItem').show();
          $('#partsInventoryMenuItem').show();
        }

        await loadCompletedRepairs(); // Load table
      } else {
        Swal.fire({ icon: 'warning', title: 'Oops...', text: 'User profile not found.' });
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred while fetching user role.' });
    }
  });
});

/***************************************** Load Completed Repairs *****************************************/
async function loadCompletedRepairs() {
  partsData = [];

  try {
    const snapshot = await firebase.firestore().collection("allDefects").get();

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.manager_approval_status === "Completed") {
        const repairNotes = Array.isArray(data.mechanic_repair_notes) ? data.mechanic_repair_notes : [];
        const partsUsed = Array.isArray(data.parts_used) ? data.parts_used : [];
        const partsToOrder = Array.isArray(data.parts_to_be_ordered) ? data.parts_to_be_ordered : [];

        const mechanicNames = [...new Set(repairNotes.map(n => n.mechanic_name || ''))].join(', ');
        const repairNoteSummaries = repairNotes.map(n => `• ${n.mechanic_name}: ${n.note || ''}`).join('<br>');
        const actualTimeTotal = repairNotes.reduce((sum, n) => sum + (parseFloat(n.actualTime) || 0), 0);

        const partsUsedSummary = partsUsed.map(p => `${p.partNumber} (x${p.part_qty}) - ${p.description}`).join('<br>');
        const partsToOrderSummary = partsToOrder.map(p => `${p.partNumber} (x${p.part_qty}) - ${p.description}`).join('<br>');

        partsData.push({
          manager_approval_date: data.manager_approval_date|| '-',
          unitNumber: data.unit_number || '-',
          repairNeeded: data.defect_description || '-',
          estimatedTime: data.estimated_hours || '-',
          mechanic: mechanicNames || '-',
          km: data.kilometers || '-',
          actualTime: actualTimeTotal || '-',
          summary: repairNoteSummaries || '-',
          partsUsed: partsUsedSummary || '-',
          partsToBeOrdered: partsToOrderSummary || '-',
          status: data.manager_approval_status || '-',
          invoiceNumber: data.invoiceNumber || '',
          docId: doc.id
        });
      }
    });

    renderTable();
  } catch (err) {
    console.error("Error loading completed repairs:", err);
    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load completed repair data.' });
  }
}

/***************************************** Render Table *****************************************/
function renderTable(filteredData = partsData) {
  const tableBody = document.getElementById('partsTableBody');
  tableBody.innerHTML = '';

  filteredData.forEach((record, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${record.manager_approval_date}</td>
      <td>${record.unitNumber}</td>
      <td>${record.repairNeeded}</td>
      <td>${record.estimatedTime}</td>
      <td>${record.mechanic}</td>
      <td>${record.km}</td>
      <td>${record.actualTime}</td>
      <td>${record.summary}</td>
      <td>${record.partsUsed}</td>
      <td>${record.partsToBeOrdered}</td>
      <td>${record.status}</td>
      <td>${record.invoiceNumber ? record.invoiceNumber : '<span class="text-muted">N/A</span>'}</td>
      <td><button class="btn btn-sm btn-primary" onclick="viewRecordByDefectId('${record.docId}')">View</button></td>
    `;
    tableBody.appendChild(row);
  });

  if (dataTableInstance) dataTableInstance.destroy();

  dataTableInstance = $('#partsTable').DataTable({
    responsive: true,
    lengthChange: false,
    searching: true,
    pageLength: 5,
    scrollX: true,
    columnDefs: [{ targets: '_all', className: 'dt-center' }]
  });
    setupFilters(); // Setup filters after initializing DataTable
}
function setupFilters() {
  const table = dataTableInstance;

  // Unit # filter on column index 1
  $('#unitFilter').on('keyup', function () {
    table.column(1).search(this.value).draw();
  });

  // Mechanic filter on column index 4
  $('#mechanicFilter').on('change', function () {
    table.column(4).search(this.value).draw();
  });

  // Invoice Number filter on column index 11
  $('#invoiceFilter').on('keyup', function () {
    table.column(11).search(this.value).draw();
  });

  // Repair Date filter (column index 0) - since it’s a date, we need to convert filter to regex
  $('#completedDate').on('change', function () {
    const date = this.value; // yyyy-mm-dd
    if (date) {
      // DataTables search by regex to match date string in the format in table
      table.column(0).search('^' + date.replace(/-/g, '\\-') + '.*$', true, false).draw();
    } else {
      table.column(0).search('').draw();
    }
  });

  // Clear filters button
  $('#clearFilters').on('click', function () {
    $('#completedDate').val('');
    $('#unitFilter').val('');
    $('#mechanicFilter').val('');
    $('#invoiceFilter').val('');

    // Clear all column searches and redraw
    table.columns().search('').draw();
  });
}



/***************************************** View Repair Modal with Invoice Save *****************************************/
async function viewRecordByDefectId(defectId) {
  try {
    const docRef = firebase.firestore().collection("allDefects").doc(defectId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return Swal.fire('Error', 'Repair record not found.', 'error');

    const data = docSnap.data();
    const mechanicNotes = data.mechanic_repair_notes || [];
    const partsUsedArray = data.parts_used || [];
    const partsToOrderArray = data.parts_to_be_ordered || [];

    const mechanicNotesHtml = mechanicNotes.length
      ? mechanicNotes.map(note => `
        <tr>
          <td>${note.mechanic_name || '-'}</td>
          <td>${note.actualTime || '-'}</td>
          <td style="white-space: pre-wrap;">${note.note || '-'}</td>
        </tr>`).join('')
      : `<tr><td colspan="3" class="text-center">No mechanic repair notes available</td></tr>`;

    const partsUsedHtml = partsUsedArray.length
      ? partsUsedArray.map(p => `
        <tr>
          <td>${p.partNumber || '-'}</td>
          <td>${p.part_qty || '-'}</td>
          <td>${p.description || p.maintenanceRepairNeeded || '-'}</td>
          <td>${p.mechanic || '-'}</td>
        </tr>`).join('')
      : `<tr><td colspan="4" class="text-center">No parts used</td></tr>`;

    const partsToOrderHtml = partsToOrderArray.length
      ? partsToOrderArray.map(p => `
        <tr>
          <td>${p.partNumber || '-'}</td>
          <td>${p.part_qty || '-'}</td>
          <td>${p.description || '-'}</td>
          <td>${p.mechanic || '-'}</td>
        </tr>`).join('')
      : `<tr><td colspan="4" class="text-center">No parts to be ordered</td></tr>`;

    const invoiceInputHtml = `
      <div class="mb-3">
        <label for="invoiceInput" class="form-label"><strong>Invoice Number:</strong></label>
        <input type="text" id="invoiceInput" class="form-control" value="${data.invoiceNumber || ''}" placeholder="Enter Invoice #">
      </div>`;

    const popupHtml = `
      <div>
        <table class="table table-bordered mb-3" style="font-size: 0.9rem;">
          <tbody>
            <tr><th>Unit #</th><td>${data.unit_number || '-'}</td></tr>
           <tr><th>Repair Date</th><td>${data.repair_date?.toDate?.().toLocaleDateString() || '-'}</td></tr>

            <tr><th>Status</th><td>${data.manager_approval_status || '-'}</td></tr>
            <tr><th>Estimated Time</th><td>${data.estimated_hours || '-'}</td></tr>
            <tr><th>Kilometers</th><td>${data.kilometers || '-'}</td></tr>
            <tr><th>Repair Needed</th><td>${data.defect_description || '-'}</td></tr>
          </tbody>
        </table>

        ${invoiceInputHtml}

        <h5>Mechanic Repair Notes</h5>
        <table class="table table-bordered mb-3" style="font-size: 0.9rem;">
          <thead class="table-primary"><tr><th>Mechanic</th><th>Hours</th><th>Notes</th></tr></thead>
          <tbody>${mechanicNotesHtml}</tbody>
        </table>

        <h5>Parts Used</h5>
        <table class="table table-bordered mb-3" style="font-size: 0.9rem;">
          <thead class="table-primary"><tr><th>Part #</th><th>Qty</th><th>Description</th><th>Mechanic</th></tr></thead>
          <tbody>${partsUsedHtml}</tbody>
        </table>

        <h5>Parts To Be Ordered</h5>
        <table class="table table-bordered" style="font-size: 0.9rem;">
          <thead class="table-primary"><tr><th>Part #</th><th>Qty</th><th>Description</th><th>Mechanic</th></tr></thead>
          <tbody>${partsToOrderHtml}</tbody>
        </table>
      </div>
    `;

    Swal.fire({
      title: `Repair Details - ${data.unit_number || '-'}`,
      html: popupHtml,
      width: '850px',
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonText: 'Save Invoice',
      cancelButtonText: 'Close',
      didOpen: () => {
        const input = Swal.getPopup().querySelector('#invoiceInput');
        const confirmBtn = Swal.getConfirmButton();

        // Initial check
        if (!input.value.trim()) {
          confirmBtn.disabled = true;
          Swal.showValidationMessage("Invoice number cannot be empty.");
        } else {
          Swal.hideValidationMessage();
          confirmBtn.disabled = false;
        }

        // Listen for input changes
        input.addEventListener('input', () => {
          if (input.value.trim()) {
            Swal.hideValidationMessage();
            confirmBtn.disabled = true;
          } else {
            Swal.showValidationMessage("Invoice number cannot be empty.");
            confirmBtn.disabled = true;
          }
        });
      },
      preConfirm: async () => {
        const invoice = document.getElementById('invoiceInput')?.value.trim();
        if (!invoice) {
          Swal.showValidationMessage("Invoice number cannot be empty.");
          throw new Error("Invoice empty");
        }

        try {
          await docRef.update({ invoiceNumber: invoice });
          await loadCompletedRepairs();
          return true;
        } catch (err) {
          Swal.showValidationMessage("Failed to update invoice.");
          throw err;
        }
      }
    });

  } catch (err) {
    console.error("Error viewing record:", err);
    Swal.fire('Error', 'Something went wrong.', 'error');
  }
}
  