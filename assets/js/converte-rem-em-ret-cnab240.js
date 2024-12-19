document.addEventListener('DOMContentLoaded', () => {
  const selectedFileNamesDisplay = document.querySelector('.success-message');

  document.getElementById('cnabFile').addEventListener('change', displaySelectedFileNames);
  document.getElementById('process-button').addEventListener('click', processFiles);

  function displaySelectedFileNames() {
    const fileInput = document.getElementById('cnabFile');
    const files = fileInput.files;

    if (files.length > 0) {
      const selectedFileNames = Array.from(files).map(file => file.name);
      displayInfoMessage(`Arquivo(s) selecionado(s): ${selectedFileNames.join(', ')}`);
    } else {
      selectedFileNamesDisplay.style.display = 'none';
    }
  }

  function p(l, i, f) {
    // p = posição
    // l = linha
    // i = Inicio
    // f = fim
    return l.slice((i - 1), f);
  }

  function processFiles() {
    const inputFile = document.getElementById('cnabFile');
    const files = inputFile.files;

    if (files.length === 0) {
      displayWarningMessage('Por favor, selecione um arquivo CNAB de Remessa');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = function (event) {
        const fileContent = event.target.result;
        const lines = fileContent.split('\n');

        if (!isValidRemessaFile(lines)) {
          displayErrorMessage(`O arquivo ${file.name} não é um arquivo CNAB de Remessa válido`);
          return;
        }

        let processedContent = [];
        let modifyingLine = false;

        for (let j = 0; j < lines.length; j++) {
          let line = lines[j];

          if (line[7] === '0') { // Header Arquivo
            line = processHeaderArquivo(line);
          }

          if (line[7] === '1') { // Header
            modifyingLine = processHeader(line);
            if (!modifyingLine) return;
          } else if (line[7] === '5') { // Trailer
            modifyingLine = false;
          } else if (line[7] === '3' && modifyingLine) { // Data lines with B flag
            line = processSegment(line);
          }

          processedContent.push(line);
        }

        const processedFileContent = processedContent.join('\n');
        downloadProcessedFile(file, processedFileContent);
      };

      reader.readAsText(file);
    }
    displaySuccessMessage('Arquivo(s) processado(s) com sucesso');
  }

  function isValidRemessaFile(lines) {
    const firstLine = lines[0].replace(/\r?\n|\r/g, '');
    return lines.length > 0 && firstLine.length === 240;
  }

  function processHeaderArquivo(line) {
    let p143a143 = "2";
    let p172a191 = "00000000BRAD        ";
    return p(line, 1, 142) + p143a143 + p(line, 144, 171) + p172a191 + p(line, 192, 240);
  }

  function processHeader(line) {
    const acceptedCodes = ['2001', '2010', '2041', '3041', '3001', '2030', '2031', '2211', '2217'];
    if (acceptedCodes.includes(p(line, 10, 13))) {
      return true;
    } else {
      displayErrorMessage(`Por favor, selecione um arquivo cuja posições 10 a 13 do header do lote seja ${acceptedCodes}`);
      return false;
    }
  }

  function processSegment(line) {
    if (line[13] === 'A') {
      return processSegmentA(line);
    } else if (line[13] === 'B') {
      return processSegmentB(line);
    } else if (line[13] === 'J' && p(line, 18, 19) !== '52') {
      return processSegmentJ(line);
    } else if (line[13] === 'J' && p(line, 18, 19) === '52') {
      return line;
    } else if (line[13] === 'O') {
      return processSegmentO(line);
    } else if (line[13] === 'N') {
      return processSegmentN(line);
    }
    return line;
  }

  function processSegmentA(line) {
    let p135a154 = p(line, 74, 93);
    let p155a162 = p(line, 94, 101);
    let p163a177 = p(line, 120, 134);
    let p231a240 = "00        ";
    return p(line, 1, 134) + p135a154 + p155a162 + p163a177 + p(line, 178, 230) + p231a240;
  }

  function processSegmentB(line) {
    let p227a232 = "000000";
    let p233a240 = "60746948";
    return p(line, 1, 226) + p227a232 + p233a240;
  }

  function processSegmentJ(line) {
    let p203a222 = p(line, 183, 202);
    let p231a240 = "00        ";
    return p(line, 1, 202) + p203a222 + p(line, 223, 230) + p231a240;
  }

  function processSegmentO(line) {
    let p143a162 = p(line, 123, 142);
    let p231a240 = "00        ";
    return p(line, 1, 142) + p143a162 + p(line, 163, 230) + p231a240;
  }

  function processSegmentN(line) {
    let p231a240 = "00        ";
    return p(line, 1, 230) + p231a240;
  }

  function downloadProcessedFile(file, content) {
    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
    const processedBlob = new Blob([content], { type: 'text/plain' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(processedBlob);
    downloadLink.download = fileNameWithoutExtension + '.ret';
    downloadLink.click();
  }
});