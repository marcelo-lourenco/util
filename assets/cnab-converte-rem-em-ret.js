document.addEventListener('DOMContentLoaded', () => {
  const selectedFileNamesDisplay = document.querySelector('.alert-success');
  const fileInput = document.getElementById('cnabFile');
  const processButton = document.getElementById('process-button');

  fileInput.addEventListener('change', displaySelectedFileNames);
  processButton.addEventListener('click', processFiles);

  /**
   * Exibe os nomes dos arquivos selecionados
   */
  function displaySelectedFileNames() {
    const files = fileInput.files;

    if (files.length > 0) {
      const selectedFileNames = Array.from(files).map(file => file.name);
      displayInfoMessage(`Arquivo(s) selecionado(s): ${selectedFileNames.join(', ')}`);
    } else {
      selectedFileNamesDisplay.style.display = 'none';
    }
  }

  /**
   * Extrai uma parte de uma string com base nas posições
   * @param {string} line - Linha do arquivo
   * @param {number} start - Posição inicial (1-based)
   * @param {number} end - Posição final (1-based)
   * @returns {string} Parte da string
   */
  function p(line, start, end) {
    return line.slice((start - 1), end);
  }

  /**
   * Identifica o banco com base nas posições específicas da primeira linha
   * @param {string} firstLine - Primeira linha do arquivo
   * @returns {string} Nome do banco: "Bradesco", "Itaú" ou "Outros"
   */
  function identifyBank(firstLine) {
    const layout = firstLine.length === 240 ? "CNAB240" : 
                   firstLine.length === 400 ? "CNAB400" : "CNAB150";

    let bankCode;
    if (layout === "CNAB150") {
      bankCode = p(firstLine, 31, 33);
    } else if (layout === "CNAB240") {
      bankCode = p(firstLine, 1, 3);
    } else if (layout === "CNAB400") {
      bankCode = p(firstLine, 77, 79);
    }

    if (bankCode === "237") return "Bradesco";
    if (bankCode === "341") return "Itaú";
    return "Outros";
  }

  /**
   * Processa os arquivos selecionados
   */
  function processFiles() {
    const files = fileInput.files;

    if (files.length === 0) {
      displayWarningMessage('Por favor, selecione um arquivo CNAB de Remessa');
      return;
    }

    for (const file of files) {
      const reader = new FileReader();

      reader.onload = function(event) {
        const fileContent = event.target.result;
        const lines = fileContent.split('\n');
        const firstLine = lines[0].replace(/\r?\n|\r/g, '');

        if (!isValidRemessaFile(firstLine)) {
          displayErrorMessage(`O arquivo ${file.name} não é um arquivo CNAB de Remessa válido`);
          return;
        }

        const bank = identifyBank(firstLine);
        const processedContent = processFile(lines, bank);
        downloadProcessedFile(file, processedContent.join('\n'));
      };

      reader.readAsText(file);
    }

    displaySuccessMessage('Arquivo(s) processado(s) com sucesso');
  }

  /**
   * Valida se o arquivo é um CNAB de remessa válido
   * @param {string} firstLine - Primeira linha do arquivo
   * @returns {boolean} Verdadeiro se for válido
   */
  function isValidRemessaFile(firstLine) {
    return firstLine.length === 240 || firstLine.length === 400;
  }

  /**
   * Processa o arquivo completo de acordo com o banco
   * @param {string[]} lines - Linhas do arquivo
   * @param {string} bank - Nome do banco
   * @returns {string[]} Conteúdo processado
   */
  function processFile(lines, bank) {
    let processedContent = [];
    let modifyingLine = false;

    for (const line of lines) {
      if (!line || line.length < 8) continue;

      const recordType = line[7];
      let processedLine = line;

      switch (recordType) {
        case '0': // Header Arquivo
          processedLine = processHeaderArquivo(line, bank);
          break;
        case '1': // Header
          modifyingLine = processHeader(line, bank);
          if (!modifyingLine) return [];
          break;
        case '3': // Segmentos (A, B, J, etc.)
          if (modifyingLine) {
            processedLine = processSegment(line, bank);
          }
          break;
        case '5': // Trailer
          modifyingLine = false;
          break;
      }

      processedContent.push(processedLine);
    }

    return processedContent;
  }

  /**
   * Processa o header do arquivo de acordo com o banco
   * @param {string} line - Linha do header
   * @param {string} bank - Nome do banco
   * @returns {string} Linha processada
   */
  function processHeaderArquivo(line, bank) {
    if (bank === "Bradesco") {
      const p143a143 = "2";
      const p172a191 = "00000000BRAD        ";
      return p(line, 1, 142) + p143a143 + p(line, 144, 171) + p172a191 + p(line, 192, 240);
    } else if (bank === "Itaú") {
      const p143a143 = "2"; // 1=REMESSA 2=RETORNO
      return p(line, 1, 142) + p143a143 + p(line, 144, 240);
    }
    return line;
  }

  /**
   * Processa o header do lote
   * @param {string} line - Linha do header
   * @param {string} bank - Nome do banco
   * @returns {boolean} Verdadeiro se o código for aceito
   */
  function processHeader(line, bank) {
    const acceptedCodes = {
      Bradesco: ['2001', '2010', '2041', '3041', '3001', '2030', '2031', '2211', '2217'],
      Itaú: ['2001', '2010', '2041', '3041', '3001', '2030', '2031', '2211', '2217'] // Exemplo, ajustar conforme necessário
    };

    const bankCodes = acceptedCodes[bank] || [];
    const currentCode = p(line, 10, 13);

    if (bankCodes.includes(currentCode)) {
      return true;
    }

    displayErrorMessage(`Por favor, selecione um arquivo cuja posições 10 a 13 do header do lote seja ${bankCodes.join(', ')}`);
    return false;
  }

  /**
   * Processa os segmentos do arquivo de acordo com o banco
   * @param {string} line - Linha do segmento
   * @param {string} bank - Nome do banco
   * @returns {string} Linha processada
   */
  function processSegment(line, bank) {
    const segmentType = line[13];

    if (bank === "Bradesco") {
      return processBradescoSegment(line, segmentType);
    } else if (bank === "Itaú") {
      return processItauSegment(line, segmentType);
    }

    return line;
  }

  /**
   * Processa segmentos do Bradesco
   * @param {string} line - Linha do segmento
   * @param {string} segmentType - Tipo do segmento (A, B, J, etc.)
   * @returns {string} Linha processada
   */
  function processBradescoSegment(line, segmentType) {
    switch (segmentType) {
      case 'A':
        return processBradescoSegmentA(line);
      case 'B':
        return processBradescoSegmentB(line);
      case 'J':
        if (p(line, 18, 19) !== '52') {
          return processBradescoSegmentJ(line);
        }
        return line;
      case 'O':
        return processBradescoSegmentO(line);
      case 'N':
        return processBradescoSegmentN(line);
      default:
        return line;
    }
  }

  /**
   * Processa segmentos do Itaú
   * @param {string} line - Linha do segmento
   * @param {string} segmentType - Tipo do segmento (A, B, J, etc.)
   * @returns {string} Linha processada
   */
  function processItauSegment(line, segmentType) {
    switch (segmentType) {
      case 'A':
        return processItauSegmentA(line);
      case 'B':
        return processItauSegmentB(line);
      default:
        return line;
    }
  }

  // Implementações específicas do Bradesco
  function processBradescoSegmentA(line) {
    const p135a154 = p(line, 74, 93);
    const p155a162 = p(line, 94, 101);
    const p163a177 = p(line, 120, 134);
    const p231a240 = "00        ";
    return p(line, 1, 134) + p135a154 + p155a162 + p163a177 + p(line, 178, 230) + p231a240;
  }

  function processBradescoSegmentB(line) {
    const p227a232 = "000000";
    const p233a240 = "60746948";
    return p(line, 1, 226) + p227a232 + p233a240;
  }

  function processBradescoSegmentJ(line) {
    const p203a222 = p(line, 183, 202);
    const p231a240 = "00        ";
    return p(line, 1, 202) + p203a222 + p(line, 223, 230) + p231a240;
  }

  function processBradescoSegmentO(line) {
    const p143a162 = p(line, 123, 142);
    const p231a240 = "00        ";
    return p(line, 1, 142) + p143a162 + p(line, 163, 230) + p231a240;
  }

  function processBradescoSegmentN(line) {
    const p231a240 = "00        ";
    return p(line, 1, 230) + p231a240;
  }

  // Implementações específicas do Itaú
  function processItauSegmentA(line) {
    const p135a154 = p(line, 74, 93) 
    const p155a162 = p(line, 94, 101);
    const p163a177 = p(line, 120, 134);
    const p198a203 = String(Math.floor(100000 + Math.random() * 900000)); // Número aleatório de 6 dígitos
    const p231a240 = "00        "; // NOTA 8
    return p(line, 1, 134) + p135a154 + p155a162 + p163a177 + p(line, 178, 230) + p231a240;
  }

  function processItauSegmentB(line) {
    // Ocorrências no retorno (posições 231-240)
    const p231a240 = "00        "; // NOTA 8
    return p(line, 1, 230) + p231a240;
  }

  /**
   * Cria e faz download do arquivo processado
   * @param {File} file - Arquivo original
   * @param {string} content - Conteúdo processado
   */
  function downloadProcessedFile(file, content) {
    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
    const processedBlob = new Blob([content], { type: 'text/plain' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(processedBlob);
    downloadLink.download = fileNameWithoutExtension + '.ret';
    downloadLink.click();
  }
});