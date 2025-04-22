
const selectedFileNamesDisplay = document.querySelector('.success-message');
const headerRow = document.getElementById('headerRow');
const outputTable = document.getElementById('output').getElementsByTagName('tbody')[0];

function p(l, i, f) {
  // p = posição
  // l = linha
  // i = Inicio 
  // f = fim
  return l.slice((i - 1), f);
}

function displaySelectedFileNames() {
  const fileInput = document.getElementById('cnabFiles');
  const files = fileInput.files;

  if (files.length > 0) {
    const selectedFileNames = Array.from(files).map(file => file.name);
    displayInfoMessage(`Arquivo(s) selecionado(s): ${selectedFileNames.join(', ')}`);
  } else {
    selectedFileNamesDisplay.style.display = 'none';
  }
}


function extractInfo(line, fileName, segmento) {
  let data;

  if (segmento === "A") {
    data = {
      nomeArquivo: fileName,
      numDoc: p(line, 74, 93),
      dataPagamento: p(line, 94, 101),
      valorPagamento: p(line, 120, 134)
    };
  } else if (segmento === "J" && p(line, 18, 19) !== "52") {
    data = {
      nomeArquivo: fileName,
      numDoc: p(line, 183, 202),
      dataVencimento: p(line, 92, 99),
      valorTitulo: p(line, 100, 114),
      dataPagamento: p(line, 145, 152),
      valorPagamento: p(line, 153, 167)
    };
  }

  for (const key in data) {
    if (!headerRow.querySelector(`[data-column="${key}"]`)) {
      const th = document.createElement('th');
      th.textContent = key;
      th.setAttribute('data-column', key);
      headerRow.appendChild(th);
    }
  }

  return data;
}


function processFiles() {
  const fileInput = document.getElementById('cnabFiles');
  const files = fileInput.files;

  if (files.length === 0) {
    displayErrorMessage('Por favor, selecione arquivo(s) de remessa ou retorno.');
    return;
  }

  // Verificar as extensões dos arquivos selecionados
  const allowedExtensions = ['.rem', '.ret', '.txt', '.REM', '.RET', '.TXT'];
  for (const file of files) {
    const fileNameParts = file.name.split('.');
    const fileExtension = `.${fileNameParts[fileNameParts.length - 1]}`;

    if (!allowedExtensions.includes(fileExtension)) {
      displayErrorMessage(`Por favor, selecione apenas arquivo(s) com extensão ".rem", ".ret" ou ".txt".`);
      return;
    }
  }

  if (files.length > 0) {
    outputTable.innerHTML = ''; // Limpar tabela

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const content = event.target.result;
        const lines = content.split('\n');
        const extractedData = [];

        for (const line of lines) {
          if (line.length >= 240) {
            let segmento = p(line, 14, 14);
            if (segmento == "A" || segmento == "J") {
              extractedData.push(extractInfo(line, file.name, segmento));
            }
          }
        }

        for (const data of extractedData) {
          const row = outputTable.insertRow();
          for (const key in data) {
            const cell = row.insertCell();
            cell.textContent = data[key];
          }
        }
      };

      reader.readAsText(file);
    }

    displaySuccessMessage('Arquivo(s) processado(s) com sucesso');
  }
}
