// Assuming alert functions (displaySuccessMessage, displayErrorMessage, displayInfoMessage)
// are defined globally, perhaps in assets/script.js, based on the target HTML structure.
// If not, they need to be defined here or included from another source.

const cnabFileInput = document.getElementById('cnabFiles');
const processButton = document.getElementById('process-button');
const headerRow = document.getElementById('headerRow');
const outputTableBody = document.getElementById('output')?.getElementsByTagName('tbody')[0]; // Added optional chaining for safety

// Function to extract substring based on 1-based indexing
function p(line, start, end) {
  // p = posição (position)
  // l = linha (line)
  // i = Inicio (start)
  // f = fim (end)
  return line.slice((start - 1), end);
}

function displaySelectedFileNames() {
  if (!cnabFileInput) return;
  const files = cnabFileInput.files;

  if (files && files.length > 0) {
    const selectedFileNames = Array.from(files).map(file => file.name);
    // Use the info alert function (assuming it exists)
    if (typeof displayInfoMessage === 'function') {
      displayInfoMessage(`Arquivo(s) selecionado(s): ${selectedFileNames.join(', ')}`);
    } else {
      console.log(`Arquivo(s) selecionado(s): ${selectedFileNames.join(', ')}`);
    }
  } else {
    // Hide the info alert if no files are selected (assuming function exists)
    if (typeof clearAlerts === 'function') { // Or a specific function to hide info
      clearAlerts('info');
    }
  }
}

function extractInfo(line, fileName, segmento) {
  let data = null; // Initialize as null

  try {
    if (segmento === "A") {
      data = {
        nomeArquivo: fileName, // Keep filename separate for table structure
        numDoc: p(line, 74, 93)?.trim(), // Add trim
        dataPagamento: p(line, 94, 101),
        valorPagamento: p(line, 120, 134)
      };
    } else if (segmento === "J" && p(line, 18, 19) !== "52") { // Ensure it's not J52
      data = {
        nomeArquivo: fileName,
        numDoc: p(line, 183, 202)?.trim(), // Add trim
        dataVencimento: p(line, 92, 99),
        valorTitulo: p(line, 100, 114),
        dataPagamento: p(line, 145, 152),
        valorPagamento: p(line, 153, 167)
      };
    }
  } catch (error) {
    console.error(`Erro ao extrair dados da linha [${segmento}] do arquivo ${fileName}:`, error);
    // Optionally display an error to the user
    if (typeof displayErrorMessage === 'function') {
      displayErrorMessage(`Erro ao processar linha no arquivo ${fileName}. Verifique o console.`);
    }
    return null; // Return null if extraction fails
  }


  // Dynamically add header columns if they don't exist
  if (data && headerRow) {
    for (const key in data) {
      if (!headerRow.querySelector(`[data-column="${key}"]`)) {
        const th = document.createElement('th');
        th.textContent = key;
        th.setAttribute('data-column', key);
        headerRow.appendChild(th);
      }
    }
  }

  return data; // Return the extracted data object (or null)
}

function clearTable() {
  if (outputTableBody) {
    outputTableBody.innerHTML = '';
  }
  if (headerRow) {
    // Reset header row to only contain the filename column initially
    headerRow.innerHTML = '<th data-column="nomeArquivo">Nome do Arquivo</th>';
  }
}


async function processFiles() {
  if (!cnabFileInput || !outputTableBody) {
    console.error("Elementos essenciais não encontrados (input ou tabela).");
    if (typeof displayErrorMessage === 'function') {
      displayErrorMessage("Erro interno: Elementos da página não encontrados.");
    }
    return;
  }

  const files = cnabFileInput.files;

  if (!files || files.length === 0) {
    if (typeof displayErrorMessage === 'function') {
      displayErrorMessage('Por favor, selecione arquivo(s) de remessa ou retorno.');
    }
    return;
  }

  // Clear previous results and alerts
  clearTable();
  if (typeof clearAlerts === 'function') {
    clearAlerts(); // Clear all types of alerts
  }

  // Validate file extensions
  const allowedExtensions = ['.rem', '.ret', '.txt']; // Lowercase for comparison
  for (const file of files) {
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      if (typeof displayErrorMessage === 'function') {
        displayErrorMessage(`Arquivo inválido: "${file.name}". Selecione apenas arquivos .rem, .ret ou .txt.`);
      }
      return; // Stop processing
    }
  }

  let filesProcessedCount = 0;
  let resultsFound = false;

  // Process each file
  for (const file of files) {
    const reader = new FileReader();

    // Use a Promise to handle asynchronous file reading
    const readFile = (file) => new Promise((resolve, reject) => {
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const lines = content.split(/\r?\n/); // Handle both Windows and Unix line endings
          const extractedDataForFile = [];

          for (const line of lines) {
            if (line.length >= 240) { // Basic CNAB 240 line length check
              const segmento = p(line, 14, 14); // Segmento is at position 14
              if (segmento === "A" || (segmento === "J" && p(line, 18, 19) !== "52")) {
                const extracted = extractInfo(line, file.name, segmento);
                if (extracted) { // Only add if data was successfully extracted
                  extractedDataForFile.push({ fileName: file.name, ...extracted });
                  resultsFound = true; // Mark that we found at least one result
                }
              }
            }
          }
          resolve(extractedDataForFile);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error(`Erro ao ler o arquivo ${file.name}:`, error);
        reject(error);
      };

      reader.readAsText(file); // Or appropriate encoding if needed
    });

    try {
      const extractedData = await readFile(file);

      // Append results to the table
      for (const data of extractedData) {
        const row = outputTableBody.insertRow();
        // Ensure cells are added in the order of the header columns
        const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.getAttribute('data-column'));
        for (const headerKey of headers) {
          const cell = row.insertCell();
          cell.textContent = data[headerKey] !== undefined ? data[headerKey] : ''; // Handle missing data for a column
        }
      }
      filesProcessedCount++;

    } catch (error) {
      if (typeof displayErrorMessage === 'function') {
        displayErrorMessage(`Falha ao processar o arquivo "${file.name}". Verifique o console.`);
      }
    }
  } // End of file loop

  // Display final status message
  if (filesProcessedCount === files.length) {
    if (resultsFound) {
      if (typeof displaySuccessMessage === 'function') {
        displaySuccessMessage(`Processamento concluído. ${filesProcessedCount} arquivo(s) verificado(s).`);
      }
    } else {
      if (typeof displayWarningMessage === 'function') { // Use warning if no results found
        displayWarningMessage(`Processamento concluído. Nenhum NUMDOC encontrado nos Segmentos A/J do(s) arquivo(s) selecionado(s).`);
      } else if (typeof displayInfoMessage === 'function') {
        displayInfoMessage(`Processamento concluído. Nenhum NUMDOC encontrado nos Segmentos A/J do(s) arquivo(s) selecionado(s).`);
      }
    }
  } else {
    if (typeof displayWarningMessage === 'function') {
      displayWarningMessage(`Processamento concluído com ${filesProcessedCount} de ${files.length} arquivo(s). Verifique mensagens de erro.`);
    }
  }
}

// Add event listeners
if (processButton) {
  processButton.addEventListener('click', processFiles);
}
if (cnabFileInput) {
  cnabFileInput.addEventListener('change', displaySelectedFileNames);
}
