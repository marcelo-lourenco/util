
// Assumindo que as funções de alerta (displaySuccessMessage, displayErrorMessage, displayInfoMessage, clearAlerts)
// são definidas globalmente, talvez em assets/script.js, com base na estrutura HTML de destino.

// --- Elementos do DOM ---
const cnabFileInput = document.getElementById('cnabFiles');
const processButton = document.getElementById('process-button');
const checkboxContainer = document.getElementById('checkboxContainer');
const headerRow = document.getElementById('headerRow');
const outputTableBody = document.getElementById('output')?.getElementsByTagName('tbody')[0];

// --- Configuração para Colunas Selecionáveis ​​(Segmento J) ---
const selectableColumnsConfig = [
  { label: "numDoc", start: 183, end: 202, checked: true },
  { label: "dataVencimento", start: 92, end: 99, checked: true },
  { label: "valorTitulo", start: 100, end: 114, checked: true },
  { label: "dataPagamento", start: 145, end: 152, checked: true },
  { label: "valorPagamento", start: 153, end: 167, checked: true },
  { label: "codigoBarras", start: 18, end: 61, checked: false } // Exemplo: desmarcado por padrão
  // Adicione mais itens conforme necessário
];

// --- Funções auxiliares ---

// Função para extrair substring com base na indexação de base 1
function p(line, start, end) {
  // p = posição (position)
  // l = linha (line)
  // i = Inicio (start)
  // f = fim (end)
  if (!line || typeof line !== 'string') return '';
  return line.slice((start - 1), end)?.trim() || '';
}

// Função para exibir nomes de arquivos selecionados no alerta de informações
function displaySelectedFileNames() {
  if (!cnabFileInput) return;
  const files = cnabFileInput.files;

  if (files && files.length > 0) {
    const selectedFileNames = Array.from(files).map(file => file.name);
    if (typeof displayInfoMessage === 'function') {
      displayInfoMessage(`Arquivo(s) selecionado(s): ${selectedFileNames.join(', ')}`);
    } else {
      console.log(`Arquivo(s) selecionado(s): ${selectedFileNames.join(', ')}`);
    }
  } else {
    if (typeof clearAlerts === 'function') {
      clearAlerts('info'); // Limpar apenas alerta de informação
    }
  }
}

// Função para criar caixas de seleção dinamicamente com base na configuração
function populateCheckboxes() {
  if (!checkboxContainer) return;
  checkboxContainer.innerHTML = ''; // Limpar conteúdo anterior

  selectableColumnsConfig.forEach(item => {
    const label = document.createElement('label');
    label.htmlFor = `checkbox-${item.label}`; // ID exclusivo para associação de rótulo

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `checkbox-${item.label}`; // ID exclusivo
    checkbox.value = item.label;
    checkbox.checked = item.checked; // Definir estado padrão
    checkbox.dataset.start = item.start;
    checkbox.dataset.end = item.end;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(item.label));

    checkboxContainer.appendChild(label);
  });
}

// Função para obter as colunas selecionadas atualmente (para o Segmento J)
function getSelectedColumns() {
  const selected = [];
  if (checkboxContainer) {
    const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
      selected.push({
        label: cb.value,
        start: parseInt(cb.dataset.start, 10),
        end: parseInt(cb.dataset.end, 10)
      });
    });
  }
  return selected;
}

// Função para extrair dados com base no segmento e nas colunas selecionadas
function extractInfo(line, fileName, segmento) {
  let data = { nomeArquivo: fileName }; // Sempre inclua o nome do arquivo

  try {
    if (segmento === "A") {
      // Colunas fixas para o Segmento A
      data.numDoc = p(line, 74, 93);
      data.dataPagamento = p(line, 94, 101);
      data.valorPagamento = p(line, 120, 134);
    } else if (segmento === "J" && p(line, 18, 19) !== "52") { // Certifique-se de que não é J52
      // Colunas dinâmicas para o Segmento J com base na seleção
      const selectedCols = getSelectedColumns();
      selectedCols.forEach(col => {
        data[col.label] = p(line, col.start, col.end);
      });
    } else {
      return null; // Não é um segmento que processamos
    }
  } catch (error) {
    console.error(`Erro ao extrair dados da linha [${segmento}] do arquivo ${fileName}:`, error);
    if (typeof displayErrorMessage === 'function') {
      displayErrorMessage(`Erro ao processar linha no arquivo ${fileName}. Verifique o console.`);
    }
    return null; // Retorna nulo se a extração falhar
  }

  return data; // Retorna o objeto de dados extraído (ou nulo)
}

// Função para atualizar cabeçalhos de tabela com base em chaves de dados extraídas
function updateTableHeaders(dataKeys) {
  if (!headerRow) return;

  // Sempre certifique-se de que 'Nome do Arquivo' seja o primeiro
  if (!headerRow.querySelector('[data-column="nomeArquivo"]')) {
    const th = document.createElement('th');
    th.textContent = 'Nome do Arquivo';
    th.setAttribute('data-column', 'nomeArquivo');
    headerRow.insertBefore(th, headerRow.firstChild); // Adicionar no início
  }

  dataKeys.forEach(key => {
    if (key !== 'nomeArquivo' && !headerRow.querySelector(`[data-column="${key}"]`)) {
      const th = document.createElement('th');
      th.textContent = key;
      th.setAttribute('data-column', key);
      headerRow.appendChild(th);
    }
  });
}


// Função para limpar a tabela de resultados
function clearTable() {
  if (outputTableBody) {
    outputTableBody.innerHTML = '';
  }
  if (headerRow) {
    // Redefine a linha do cabeçalho para conter inicialmente apenas a coluna do nome do arquivo
    headerRow.innerHTML = '<th data-column="nomeArquivo">Nome do Arquivo</th>';
  }
}

// --- Função de processamento principal ---
async function processFiles() {
  if (!cnabFileInput || !outputTableBody || !headerRow) {
    console.error("Elementos essenciais não encontrados (input, tabela ou header).");
    if (typeof displayErrorMessage === 'function') {
      displayErrorMessage("Erro interno: Elementos da página não encontrados.");
    }
    return;
  }

  const files = cnabFileInput.files;

  if (!files || files.length === 0) {
    if (typeof displayErrorMessage === 'function') {
      displayErrorMessage('Por favor, selecione arquivo(s) CNAB (.rem, .ret, .txt).');
    }
    return;
  }

  // Limpar resultados e alertas anteriores
  clearTable();
  if (typeof clearAlerts === 'function') {
    clearAlerts(); // Limpar todos os tipos de alertas
  }

  // Validar extensões de arquivo
  const allowedExtensions = ['.rem', '.ret', '.txt']; // Minúsculas para comparação
  for (const file of files) {
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      if (typeof displayErrorMessage === 'function') {
        displayErrorMessage(`Arquivo inválido: "${file.name}". Selecione apenas arquivos .rem, .ret ou .txt.`);
      }
      return; // Parar processamento
    }
  }

  let filesProcessedCount = 0;
  let resultsFound = false;
  let allExtractedData = []; // Armazena todos os dados antes de atualizar cabeçalhos/tabelas

  // Processar cada arquivo
  for (const file of files) {
    const reader = new FileReader();

    const readFile = (file) => new Promise((resolve, reject) => {
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const lines = content.split(/\r?\n/); // Lidar com terminações de linha do Windows e do Unix
          const extractedDataForFile = [];

          for (const line of lines) {
            if (line.length >= 240) { // Verificação básica do comprimento da linha CNAB 240
              const segmento = p(line, 14, 14); // Segmento está na posição 14
              if (segmento === "A" || (segmento === "J" && p(line, 18, 19) !== "52")) {
                const extracted = extractInfo(line, file.name, segmento);
                if (extracted) {
                  extractedDataForFile.push(extracted);
                  resultsFound = true;
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

      reader.readAsText(file); // Ou codificação apropriada, se necessário
    });

    try {
      const extractedData = await readFile(file);
      allExtractedData = allExtractedData.concat(extractedData); // Coletar dados de todos os arquivos
      filesProcessedCount++;

    } catch (error) {
      if (typeof displayErrorMessage === 'function') {
        displayErrorMessage(`Falha ao processar o arquivo "${file.name}". Verifique o console.`);
      }
    }
  } // Fim do loop de arquivo

  // --- Preencher tabela após processar todos os arquivos ---
  if (resultsFound) {
    // Determina todas as chaves exclusivas necessárias para cabeçalhos de todos os resultados
    const allKeys = new Set(['nomeArquivo']); // Comece com o nome do arquivo
    allExtractedData.forEach(data => {
      Object.keys(data).forEach(key => allKeys.add(key));
    });

    // Atualiza cabeçalhos com base em todas as chaves encontradas
    updateTableHeaders(Array.from(allKeys));

    // Obter a ordem final dos cabeçalhos
    const headerOrder = Array.from(headerRow.querySelectorAll('th')).map(th => th.getAttribute('data-column'));

    // Preencher corpo da tabela
    allExtractedData.forEach(data => {
      const row = outputTableBody.insertRow();
      headerOrder.forEach(headerKey => {
        const cell = row.insertCell();
        cell.textContent = data[headerKey] !== undefined ? data[headerKey] : ''; // Lidar com dados ausentes para uma coluna
      });
    });
  }

  // Exibir mensagem de status final
  if (filesProcessedCount === files.length) {
    if (resultsFound) {
      if (typeof displaySuccessMessage === 'function') {
        displaySuccessMessage(`Processamento concluído. ${filesProcessedCount} arquivo(s) verificado(s). Dados extraídos.`);
      }
    } else {
      if (typeof displayWarningMessage === 'function') {
        displayWarningMessage(`Processamento concluído. Nenhum dado relevante encontrado nos Segmentos A/J do(s) arquivo(s) selecionado(s).`);
      } else if (typeof displayInfoMessage === 'function') {
        displayInfoMessage(`Processamento concluído. Nenhum dado relevante encontrado nos Segmentos A/J do(s) arquivo(s) selecionado(s).`);
      }
    }
  } else {
    if (typeof displayWarningMessage === 'function') {
      displayWarningMessage(`Processamento concluído com ${filesProcessedCount} de ${files.length} arquivo(s). Verifique mensagens de erro.`);
    }
  }
}

// --- Inicialização e ouvintes de eventos ---

// Preencha as caixas de seleção no carregamento da página
document.addEventListener('DOMContentLoaded', populateCheckboxes);

// Adicionar ouvintes de eventos
if (processButton) {
  processButton.addEventListener('click', processFiles);
}
if (cnabFileInput) {
  cnabFileInput.addEventListener('change', displaySelectedFileNames);
}
