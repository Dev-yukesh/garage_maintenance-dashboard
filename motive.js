document.addEventListener('DOMContentLoaded', function () {
  fetch('/getMotiveReports')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      return response.json();
    })
    .then(data => {
        console.log('Full data:', data);
      const reports = data.inspection_reports || [];
      const table = $('#motiveReportsTable').DataTable();
      table.clear(); // Clear existing data if reloading

      reports.forEach((entry, index) => {
        const report = entry.inspection_report;

      // Check defects array and log it
        // Safely get defects array
        const defectsArray = report.defects || [];
        //console.log(defectsArray);

        // Map defects into a detailed multiline string with HTML line breaks
        const defectsFormatted = defectsArray.length
          ? defectsArray.map(d => {
              const defect = d.defect || {};
              return `ID: ${defect.id || 'N/A'}<br>Category: ${defect.category || 'N/A'}<br>Area: ${defect.area || 'N/A'}<br>Type: ${defect.type || 'N/A'}`;
            }).join('<hr>')
          : 'None';
        //  console.log(defectsArray);

        // Format vehicle details as multiline key:value
        const vehicle = report.vehicle || {};
        // console.log(`Vehicles for report ${index}:`, vehicle);
        const vehicleDetails = [
          `ID: ${vehicle.id || 'N/A'}`,
          `Number: ${vehicle.number || 'N/A'}`,
          `Year: ${vehicle.year || 'N/A'}`,
          `Make: ${vehicle.make || 'N/A'}`,
          `Model: ${vehicle.model || 'N/A'}`,
          `VIN: ${vehicle.vin || 'N/A'}`,
          `Metric Units: ${vehicle.metric_units ? 'Yes' : 'No'}`,
        ].join('<br>');

        table.row.add([
          index + 1,
          report.log_id || 'N/A',
          report.date || 'N/A',
          report.time || 'N/A',
          report.vehicle_number || 'N/A',
          report.odometer || 'N/A',
          report.carrier_name || 'N/A',
          report.location || 'N/A',
          report.status || 'N/A',
          report.inspection_type || 'N/A',
          report.driver_signed_at || 'N/A',
          report.mechanic_signed_at || 'N/A',
          report.reviewer_signed_at || 'N/A',
          report.inspection_duration || 'N/A',
          report.declaration || 'N/A',
          defectsFormatted,
          vehicleDetails,
        ]);
      });

      table.draw();
    })
    .catch(err => {
      alert('Error loading inspection reports.');
      console.error(err);
    });
});
