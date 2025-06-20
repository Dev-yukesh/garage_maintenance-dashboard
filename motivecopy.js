document.addEventListener('DOMContentLoaded', () => {
  fetch('/getMotiveReports')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      return response.json();
    })
    .then(data => {
      const tbody = document.querySelector('#inspectionTable tbody');
      tbody.innerHTML = ''; // Clear old data

      if (!data.inspection_reports || data.inspection_reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No reports found</td></tr>';
        return;
      }

      data.inspection_reports.forEach((item, index) => {
        const report = item.inspection_report;

        const defectCategories = (report.defects || [])
          .map(d => d.defect?.category || 'Unknown')
          .join(', ');

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${report.date || 'N/A'}</td>
          <td>${report.vehicle_number || 'N/A'}</td>
          <td>${report.location || 'N/A'}</td>
          <td>${report.inspection_type || 'N/A'}</td>
          <td>${defectCategories || 'None'}</td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch(error => {
      console.error(error);
      const tbody = document.querySelector('#inspectionTable tbody');
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading data</td></tr>`;
    });
});
