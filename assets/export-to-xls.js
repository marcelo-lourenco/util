document.addEventListener('DOMContentLoaded', function () {
  const exportButtonContainer = document.getElementById('export-button-container');
  const exportButton = document.getElementById('export-xlsx-button');
  const outputTable = document.getElementById('output');

  function updateExportButtonVisibility() {
    if (!outputTable || !exportButtonContainer) return;

    const tBody = outputTable.querySelector('tbody');
    if (tBody && tBody.rows.length > 0) {
      exportButtonContainer.style.display = 'block'; // Or 'inline-block' if preferred
    } else {
      exportButtonContainer.style.display = 'none';
    }
  }

  // Initial check when the page loads
  updateExportButtonVisibility();

  // Observe changes in the table body to update button visibility dynamically
  const outputTableBody = outputTable ? outputTable.querySelector('tbody') : null;
  if (outputTableBody) {
    const observer = new MutationObserver(function(mutationsList, observer) {
      // Call updateExportButtonVisibility whenever the table content changes
      updateExportButtonVisibility();
    });
    // Start observing the target node for configured mutations
    observer.observe(outputTableBody, { childList: true }); // Observes additions/removals of child nodes (e.g., <tr> elements)
  } else {
    console.warn('Table body for output not found. Export button visibility might not update dynamically.');
  }

  if (exportButton) {
    exportButton.addEventListener('click', function (event) {
      event.preventDefault(); // Previne a ação padrão do link
      const table = document.getElementById('output'); // Re-fetch table, though outputTable should be the same
      if (!table) {
        alert('Tabela de resultados não encontrada.');
        return;
      }

      // Re-check visibility and data just before export, though visibility should be handled by updateExportButtonVisibility
      updateExportButtonVisibility(); // Ensure button is visible if there's data
      const tBody = table.querySelector('tbody'); // Re-fetch tbody
      if (!tBody || tBody.rows.length === 0) {
        alert('Não há dados na tabela para exportar.');
        exportButtonContainer.style.display = 'none'; // Hide if no data after all
        return;
      }

      const data = [];

      // Get headers
      const headerRow = table.querySelector('thead tr#headerRow');
      if (headerRow) {
        const headers = [];
        headerRow.querySelectorAll('th').forEach(th => headers.push(th.textContent.trim()));
        data.push(headers);
      } else {
        alert('Cabeçalho da tabela não encontrado.');
        return;
      }

      // Get data rows
      tBody.querySelectorAll('tr').forEach(tr => {
        const rowData = [];
        tr.querySelectorAll('td').forEach(td => rowData.push(td.textContent.trim()));
        data.push(rowData);
      });

      // Create worksheet and workbook
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ExtracaoCNAB');

      // Generate XLSX file and trigger download
      XLSX.writeFile(wb, 'resultado.xlsx');
    });
  }
});