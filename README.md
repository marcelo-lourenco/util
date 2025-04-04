# Util

Este repositório contém ferramentas e recursos para apoio aos testes de software, com foco em automação e manipulação de arquivos CNAB, geração de dados fictícios e scripts para MongoDB.

## Funcionalidades

### CNAB 240

- **Conversão de Arquivos**: Ferramenta para converter arquivos de remessa (.REM) em arquivos de retorno (.RET).
- **Localização de NUMDOC**: Localiza informações específicas (como NUMDOC) em arquivos CNAB 240 com segmentos A e J.
- **Seleção de Colunas**: Permite selecionar e exibir colunas específicas de arquivos CNAB 240.

### MongoDB

- **Gerador de Documentos**: Gera scripts para inserção em coleções MongoDB a partir de arquivos JSON ou CSV.

### Geradores de Dados

- **Gerador de Dados Brasileiros**: Gera dados fictícios como CPF, CNPJ, RG, CNH, PIS, CEP, entre outros, para testes e desenvolvimento.

### Extensões e Pacotes

- **Extensão Chrome**: Ferramentas como "CNAB Converte Remessa para Retorno" e "Jira Expandir Área de Trabalho".
- **Pacote NPM**: Gerador de dados brasileiros disponível como pacote NPM.
- **Extensão VS Code**: API Test Builder para converter Swagger em scripts de teste para Playwright e Cypress.

## Tecnologias Utilizadas

- **HTML, CSS e JavaScript**: Para a interface e funcionalidades principais.
- **Bootstrap e jQuery**: Para estilização e manipulação de DOM.
- **Moment.js**: Para manipulação de datas.
- **MongoDB**: Para geração de scripts de inserção.

## Como Usar

### Demo Online

Acesse a demonstração online para explorar as funcionalidades:
[https://marcelo-lourenco.github.io/util/](https://marcelo-lourenco.github.io/util/)

### Ferramentas Disponíveis

- **CNAB 240 - Converter Arquivo de Remessa em Retorno**: [cnab-converte-rem-em-ret.html](cnab-converte-rem-em-ret.html)
- **CNAB 240 - Localizar NUMDOC**: [cnab240-localiza-numdoc.html](cnab240-localiza-numdoc.html)
- **Gerar Documentos para MongoDB**: [mongo-gera-controle-lancamentos.html](mongo-gera-controle-lancamentos.html)

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---
Desenvolvido por Marcelo Lourenço.
