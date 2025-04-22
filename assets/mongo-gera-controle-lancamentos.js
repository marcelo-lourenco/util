
// --- Elementos do DOM ---
const jsonFileInput = document.getElementById('jsonFile');
const processJsonButton = document.getElementById('process-button-json');
const csvFileInput = document.getElementById('csvFile');
const processCsvButton = document.getElementById('process-button-csv');
const createFileButton = document.getElementById('create-file-button');

// --- Funções auxiliares ---

// Função para extrair substring (se necessário, caso contrário, remover)
// função p(linha, início, fim) { ... }

// Função para exibir os nomes dos arquivos selecionados (Opcional - o Bootstrap agora lida com isso visualmente)
/* function displayFileName(inputId, labelId) {
  const fileInput = document.getElementById(inputId);
  const label = document.getElementById(labelId); // Este rótulo pode não existir mais

  if (fileInput && fileInput.files.length > 0) {
    // Update something else if needed, e.g., an info alert
    if (typeof displayInfoMessage === 'function') {
        displayInfoMessage(`Arquivo selecionado: ${fileInput.files[0].name}`);
    }
  }
} */

// Função para obter aplicacaoOrigem com base em tipo_p_e
function getAplicacaoOrigem(tipo_p_e) {
  switch (tipo_p_e) {
    case 'P':
      return 'REGISTRO_PAGAR';
    case 'F':
      return 'REGISTRO_FOLHA';
    case '!':
      return 'RESIN_INVEST';
    default:
      // Considere adicionar um padrão ou tratamento de erros
      console.warn(`Tipo P/E não reconhecido: ${tipo_p_e}`);
      return 'DESCONHECIDO'; // Ou nulo, ou lançar erro
  }
}

// Função para disparar download de arquivo
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(link.href); // Limpar
}

// --- Lógica de processamento central ---

function processJSONContent(jsonContent, file) {
  try {
    const data = JSON.parse(jsonContent);
    const sistema = data.sistema || 'DESCONHECIDO';
    const lotes = data.lotes;

    if (!Array.isArray(lotes)) {
        throw new Error("Estrutura JSON inválida: 'lotes' não é um array.");
    }

    const result = lotes.flatMap((lote) => {
      if (!Array.isArray(lote.pagamentos)) {
          console.warn("Lote sem 'pagamentos' ou 'pagamentos' não é array:", lote);
          return []; // Pular este lote
      }
      return lote.pagamentos.map((pagamento) => {
        // Validação básica
        if (!pagamento?.pagto?.venc || !Array.isArray(pagamento.pagto.venc) || pagamento.pagto.venc.length < 3) {
            console.error("Dados de vencimento inválidos:", pagamento);
            throw new Error("Dados de vencimento inválidos em um dos pagamentos.");
        }
        if (pagamento?.pagto?.numDoc === undefined || pagamento?.pagto?.vlDoc === undefined) {
             console.error("numDoc ou vlDoc ausente:", pagamento);
            throw new Error("numDoc ou vlDoc ausente em um dos pagamentos.");
        }

        const [ano, mes, dia] = pagamento.pagto.venc;
        const dataVenc = moment([ano, mes - 1, dia]); // Meses em moment.js são 0-indexados (0 = janeiro, 11 = dezembro)
        const dataHoje = moment();
        const dataDoisDiasAtras = moment().subtract(2, 'days');
        const dataUmDiaAtras = moment().subtract(1, 'days');

        if (!dataVenc.isValid()) {
            console.error("Data de vencimento inválida após parse:", pagamento.pagto.venc);
            throw new Error(`Data de vencimento inválida: ${pagamento.pagto.venc.join('-')}`);
        }

        return {
          aplicacaoOrigem: sistema,
          numDoc: String(pagamento.pagto.numDoc),
          dataAgendamento: { $date: dataVenc.toISOString() },
          createDate: { $date: dataDoisDiasAtras.toISOString() },
          lastModifiedDate: { $date: dataDoisDiasAtras.toISOString() },
          dataGeracaoArquivoRetornoBanco: { $date: dataUmDiaAtras.toISOString() },
          dataProcessamentoRetornoBanco: { $date: dataHoje.toISOString() },
          dataPagamento: { $date: dataVenc.toISOString() },
          dataRealEfeticacaoPagamento: { $date: dataVenc.toISOString() },
          valorPagamento: parseFloat(pagamento.pagto.vlDoc),
          valorRealPagamento: parseFloat(pagamento.pagto.vlDoc),
          codigoOcorrenciaRetorno: "00",
          _class: "model.ControleLancamento",
        };
      });
    });

    if (result.length === 0) {
        if (typeof displayWarningMessage === 'function') {
            displayWarningMessage('Nenhum documento válido encontrado no JSON para gerar o script.');
        } else {
            alert('Nenhum documento válido encontrado no JSON para gerar o script.');
        }
        return;
    }

    const outputFileContent = `db.controle_lancamentos.insertMany(${JSON.stringify(result, null, 2)});`;
    const outputFileName = file.name.replace(/\.[^/.]+$/, "") + ".mongodb.js";

    downloadFile(outputFileContent, outputFileName, 'text/javascript');

    if (typeof displaySuccessMessage === 'function') {
        displaySuccessMessage(`Arquivo "${outputFileName}" gerado com sucesso com ${result.length} documento(s).`);
    } else {
        alert(`Arquivo "${outputFileName}" gerado com sucesso com ${result.length} documento(s).`);
    }

  } catch (error) {
      console.error("Erro ao processar JSON:", error);
      if (typeof displayErrorMessage === 'function') {
          displayErrorMessage(`Erro ao processar JSON: ${error.message}. Verifique o console.`);
      } else {
          alert(`Erro ao processar JSON: ${error.message}. Verifique o console.`);
      }
  }
}

function handleJsonFileProcessing() {
  if (!jsonFileInput || !jsonFileInput.files || jsonFileInput.files.length === 0) {
    if (typeof displayErrorMessage === 'function') {
        displayErrorMessage('Por favor, selecione um arquivo JSON.');
    } else {
        alert('Por favor, selecione um arquivo JSON.');
    }
    return;
  }

  const file = jsonFileInput.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const jsonContent = e.target.result;
    if (typeof clearAlerts === 'function') clearAlerts(); // Limpar mensagens anteriores
    processJSONContent(jsonContent, file);
  };

  reader.onerror = function (e) {
      console.error("Erro ao ler arquivo JSON:", e);
       if (typeof displayErrorMessage === 'function') {
           displayErrorMessage('Erro ao ler o arquivo JSON selecionado.');
       } else {
           alert('Erro ao ler o arquivo JSON selecionado.');
       }
  }

  reader.readAsText(file);
}


function validateCSVHeaders(headers) {
  // Colunas necessárias ajustadas com base no exemplo e no código
  const requiredColumns = ['NUMERO_DOC', 'TIPO_P_E', 'CNPJ', 'DATA_VENCIMENTO', 'DATA_PAGAMENTO', 'VALOR', 'VL_REAL_PAGO'];
  const missingColumns = [];

  for (const column of requiredColumns) {
    // Verificação sem distinção entre maiúsculas e minúsculas, corte de espaços em branco
    if (!headers.some(header => header.trim().toUpperCase() === column)) {
      missingColumns.push(column);
    }
  }

  if (missingColumns.length > 0) {
      const errorMessage = `Coluna(s) obrigatória(s) ausente(s) no cabeçalho do CSV: ${missingColumns.join(', ')}.`;
      if (typeof displayErrorMessage === 'function') {
          displayErrorMessage(errorMessage);
      } else {
          alert(errorMessage);
      }
      return false;
  }
  return true;
}


function processCSVContent(csvContent, file) {
    try {
        const lines = csvContent.trim().split(/\r?\n/); // Lidar com diferentes terminações de linha
        if (lines.length < 2) {
            throw new Error("Arquivo CSV vazio ou contém apenas o cabeçalho.");
        }

        const headers = lines[0].split(/[,;]/).map(h => h.trim().toUpperCase());

        // Encontre índices com base em cabeçalhos (mais robustos do que posições fixas)
        const idxNumDoc = headers.indexOf('NUMERO_DOC');
        const idxTipoPE = headers.indexOf('TIPO_P_E');
        const idxCnpj = headers.indexOf('CNPJ');
        const idxDataVenc = headers.indexOf('DATA_VENCIMENTO');
        const idxDataPag = headers.indexOf('DATA_PAGAMENTO');
        const idxValor = headers.indexOf('VALOR');
        const idxValorReal = headers.indexOf('VL_REAL_PAGO');

        if (!validateCSVHeaders(headers)) { // A validação agora usa cabeçalhos em letras maiúsculas
            return; // Pare se os cabeçalhos forem inválidos
        }

        // Remover linha de cabeçalho
        lines.shift();

        const data = lines.map((line, index) => {
            const values = line.split(/[,;]/); // Use o mesmo delimitador dos cabeçalhos

            // Validação básica para comprimento de linha
            if (values.length < headers.length) {
                console.warn(`Linha ${index + 2} ignorada: número de colunas (${values.length}) menor que cabeçalho (${headers.length}). Linha: ${line}`);
                return null; // Pular esta linha
            }

            const numDoc = values[idxNumDoc]?.trim();
            const tipoPE = values[idxTipoPE]?.trim();
            const cnpj = values[idxCnpj]?.trim();
            const dataVencStr = values[idxDataVenc]?.trim();
            const dataPagStr = values[idxDataPag]?.trim();
            const valorStr = values[idxValor]?.trim();
            const valorRealStr = values[idxValorReal]?.trim();

            // Valida os campos obrigatórios para a linha
            if (!numDoc || !tipoPE || !cnpj || !dataVencStr || !dataPagStr || !valorStr || !valorRealStr) {
                 console.warn(`Linha ${index + 2} ignorada: contém valores vazios em colunas obrigatórias. Linha: ${line}`);
                 return null; // Skip line with missing required data
            }

            // Análise de data (usando o formato específico do exemplo)
            // 'DD-MMM-YY' requer a localidade em inglês para abreviações de meses (ABR, JUN)
            // Certifique-se de que a localidade do momento esteja definida corretamente, se necessário, ou use um formato mais robusto, como YYYY-MM-DD, se possível em CSV
            const dataVenc = moment(dataVencStr, 'DD-MMM-YY', 'en'); // Especificar formato e localidade
            const dataPag = moment(dataPagStr, 'DD-MMM-YY', 'en');

            if (!dataVenc.isValid() || !dataPag.isValid()) {
                console.warn(`Linha ${index + 2} ignorada: formato de data inválido ('${dataVencStr}' ou '${dataPagStr}'). Use DD-MMM-YY (ex: 10-APR-23). Linha: ${line}`);
                return null; // Pular fila com data inválida
            }

            // Análise de Valor
            const valor = parseFloat(valorStr);
            const valorReal = parseFloat(valorRealStr);

            if (isNaN(valor) || isNaN(valorReal)) {
                 console.warn(`Linha ${index + 2} ignorada: valor inválido ('${valorStr}' ou '${valorRealStr}'). Linha: ${line}`);
                 return null; // Pular fila com número inválido
            }

            const dataHoje = moment();
            const dataDoisDiasAtras = moment().subtract(2, 'days');
            const dataUmDiaAtras = moment().subtract(1, 'days');

            return {
                aplicacaoOrigem: getAplicacaoOrigem(tipoPE),
                numDoc: numDoc,
                cpfCnpj: cnpj, // Utilizando a coluna CNPJ
                dataAgendamento: { "$date": dataVenc.toISOString() },
                createDate: { "$date": dataDoisDiasAtras.toISOString() },
                lastModifiedDate: { "$date": dataDoisDiasAtras.toISOString() },
                dataGeracaoArquivoRetornoBanco: { "$date": dataUmDiaAtras.toISOString() },
                dataProcessamentoRetornoBanco: { "$date": dataHoje.toISOString() },
                dataPagamento: { "$date": dataPag.toISOString() },
                dataRealEfeticacaoPagamento: { "$date": dataPag.toISOString() },
                valorPagamento: valor,
                valorRealPagamento: valorReal,
                codigoOcorrenciaRetorno: "00",
                _class: "model.ControleLancamento",
            };
        }).filter(item => item !== null); // Remover linhas puladas (itens nulos)


        if (data.length === 0) {
            if (typeof displayWarningMessage === 'function') {
                displayWarningMessage('Nenhum documento válido encontrado no CSV para gerar o script.');
            } else {
                alert('Nenhum documento válido encontrado no CSV para gerar o script.');
            }
            return;
        }

        // Gerar o arquivo de saída
        const output = `db.controle_lancamentos.insertMany(${JSON.stringify(data, null, 2)});`;
        const outputFileName = file.name.replace(/\.[^/.]+$/, "") + ".mongodb.js";

        downloadFile(output, outputFileName, 'text/javascript');

        if (typeof displaySuccessMessage === 'function') {
            displaySuccessMessage(`Arquivo "${outputFileName}" gerado com sucesso com ${data.length} documento(s).`);
        } else {
            alert(`Arquivo "${outputFileName}" gerado com sucesso com ${data.length} documento(s).`);
        }

    } catch (error) {
        console.error("Erro ao processar CSV:", error);
        if (typeof displayErrorMessage === 'function') {
            displayErrorMessage(`Erro ao processar CSV: ${error.message}. Verifique o console.`);
        } else {
            alert(`Erro ao processar CSV: ${error.message}. Verifique o console.`);
        }
    }
}


function handleCsvFileProcessing() {
  if (!csvFileInput || !csvFileInput.files || csvFileInput.files.length === 0) {
    if (typeof displayErrorMessage === 'function') {
        displayErrorMessage('Por favor, selecione um arquivo CSV.');
    } else {
        alert('Por favor, selecione um arquivo CSV.');
    }
    return;
  }

  const file = csvFileInput.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const csvContent = e.target.result;
     if (typeof clearAlerts === 'function') clearAlerts(); // Limpar mensagens anteriores
    processCSVContent(csvContent, file);
  };

   reader.onerror = function (e) {
      console.error("Erro ao ler arquivo CSV:", e);
       if (typeof displayErrorMessage === 'function') {
           displayErrorMessage('Erro ao ler o arquivo CSV selecionado.');
       } else {
           alert('Erro ao ler o arquivo CSV selecionado.');
       }
  }

  reader.readAsText(file);
}


function createSampleCSVFile() {
  const csvContent = `NUMERO_DOC,TIPO_P_E,CNPJ,DATA_VENCIMENTO,DATA_PAGAMENTO,VALOR,VL_REAL_PAGO
15567320,P,00000000000191,10-APR-23,11-APR-23,4118.83,4118.83
15569180,F,00000000000191,10-APR-23,11-APR-23,2702.62,2702.62
21230196,!,00000000000191,28-JUN-23,29-JUN-23,5252.8,5252.8`;

  const fileName = 'modelo-para-gerar-controle-lancamento.csv';
  downloadFile(csvContent, fileName, 'text/csv');
   if (typeof displayInfoMessage === 'function') {
       displayInfoMessage(`Arquivo modelo "${fileName}" gerado.`);
   }
}

// --- Ouvintes de eventos ---
document.addEventListener('DOMContentLoaded', () => {
    // Anexe ouvintes de eventos após o DOM estar totalmente carregado

    if (processJsonButton) {
        processJsonButton.addEventListener('click', handleJsonFileProcessing);
    } else {
        console.error("Botão 'process-button-json' não encontrado.");
    }

    if (processCsvButton) {
        processCsvButton.addEventListener('click', handleCsvFileProcessing);
    } else {
         console.error("Botão 'process-button-csv' não encontrado.");
    }

    if (createFileButton) {
        createFileButton.addEventListener('click', createSampleCSVFile);
    } else {
         console.error("Botão 'create-file-button' não encontrado.");
    }

    // Opcional: adicione ouvintes às entradas de arquivo para mostrar o nome do arquivo selecionado no alerta de informações
    /* if (jsonFileInput) {
        jsonFileInput.addEventListener('change', () => displayFileName('jsonFile', null)); // Não é necessário nenhum ID de etiqueta agora
    }
     if (csvFileInput) {
        csvFileInput.addEventListener('change', () => displayFileName('csvFile', null));
    } */

});
