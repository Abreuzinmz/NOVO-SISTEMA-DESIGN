# Documento de Arquitetura e Design - Retífica Mendonça

Este documento detalha a arquitetura, o modelo de dados e as decisões de design da **versão LOCAL de testes** do sistema da **Retífica Mendonça**. É uma aplicação desktop híbrida (Next.js + Electron) que funciona **100% local**, em um único computador: o SQLite é a única fonte de dados e não há nenhuma conexão com banco de dados na nuvem.

---

## 1. Visão Geral do Sistema

O software é uma ferramenta de gestão interna voltada para retíficas de motores, cobrindo:
*   **Gestão de Clientes**: Cadastro e controle de clientes regulares e mecânicos parceiros.
*   **Ordem de Serviço (O.S.)**: Ciclo completo da O.S., desde a entrada do motor, inventário de peças deixadas, seleção de serviços, controle financeiro (pagamentos/entradas), até a finalização e entrega.
*   **Tabela de Preços e Catálogo**: Gerenciamento de preços de serviços específicos associados a modelos de motores e catalogação de serviços padronizados.
*   **Impressão Dinâmica**: Geração de comprovantes físicos (térmicos ou folha A4) e exportação em PDF.

---

## 2. Tecnologias Utilizadas

```mermaid
graph TD
    subgraph Frontend (Renderer Process)
        UI[Next.js + React 19] --> Tailwind[Tailwind CSS]
        UI --> FM[Framer Motion]
        UI --> Store[React Context Store]
    end
    
    subgraph Desktop Bridge (IPC)
        Store --> Preload[preload.js - electronAPI]
    end

    subgraph Backend (Main Process)
        Preload --> Main[main.js]
        Main --> SQLite[(SQLite - better-sqlite3)]
    end

```

*   **Core / Engine**: Next.js 15 (React 19) rodando no frontend (processo de renderização do Electron).
*   **Desktop Shell**: Electron 31 para integração nativa com o sistema operacional (janela, sistema de arquivos, impressão física, diálogos nativos).
*   **Banco de Dados**: SQLite através da biblioteca `better-sqlite3`, única fonte de dados do sistema. O arquivo `retifica-local.db` fica em `%APPDATA%\retifica-mendonca-local\` (pasta própria desta cópia, separada do sistema original).
*   **Estilização e Animações**: Tailwind CSS para interface responsiva com design moderno e Framer Motion para micro-animações fluidas e transições de tela.

---

## 3. Arquitetura Local (sem sincronização)

Todas as leituras e escritas vão direto para o SQLite local através do canal IPC do Electron (`window.electronAPI`). Não existe fila de sincronização, coluna `sync_status` nem backend remoto: uma exclusão apaga o registro na hora.

*   **Pasta de dados própria**: `main.js` fixa a pasta `userData` em `%APPDATA%\retifica-mendonca-local`, tanto em desenvolvimento quanto no app instalado. Ali ficam o banco `retifica-local.db` e o `localStorage` (preferências de interface, como tamanho da fonte e cilindradas personalizadas).
*   **Fora do Electron** (ex.: abrir `http://localhost:3210` num navegador comum) o banco não está disponível: a interface carrega vazia e avisa que é preciso usar o aplicativo desktop.
*   **Dados padrão**: no primeiro uso o app cria sozinho 5 motores e 158 modelos de referência (`lib/motors.ts`). Formas de pagamento, status, catálogo de serviços e cilindradas padrão ficam no próprio código.

---

## 4. Modelagem de Dados (Esquema SQLite)

O banco de dados local armazena os dados sob a seguinte estrutura de tabelas:

### 4.1. Clientes (`clientes`)
Armazena as informações cadastrais dos clientes.
*   `id` (TEXT, PK): Identificador único (gerado em UUID).
*   `name` (TEXT): Nome completo ou Razão Social.
*   `phone` / `phone2` (TEXT): Telefones de contato.
*   `document` (TEXT): CPF ou CNPJ.
*   `whatsapp` (TEXT): Número de celular para envio de mensagens.
*   `city` (TEXT): Cidade do cliente.
*   `client_type` (TEXT): Categoria (`regular` ou `mechanic`).
*   `nickname` (TEXT): Apelido.
*   `default_mechanic_id` (TEXT): Mecânico padrão (id de outro cliente do tipo `mechanic`).
*   `updated_at` (TEXT): Timestamp da última modificação.

### 4.2. Ordens de Serviço (`ordens_servico`)
Armazena a ficha técnica de entrada e saída dos serviços.
*   `id` (INTEGER, PK): ID autoincremento para controle interno.
*   `os_number` (INTEGER): Número legível da O.S. exposto ao cliente.
*   `client_id` (TEXT): Referência ao ID do cliente.
*   `mechanic_id` (TEXT): Mecânico responsável (id de um cliente do tipo `mechanic`).
*   `motor_model` (TEXT): Motores da O.S., separados por `, ` (ex: *AP (4 CIL), FIRE*). Uma O.S. pode ter vários motores.
*   `displacement` (TEXT): Cilindradas na mesma ordem dos motores, separadas por `, ` (ex: *1.6, 1.0*).
*   `service_status` (TEXT): Estado da O.S. (`Na Fila`, `Em Andamento`, `Aguardando Peça`, `Pronto`, `Levou`).
*   `payment_status` (TEXT): Estado financeiro (`Não Pago`, `Entrada`, `Pago`).
*   `entry_value` (REAL): Valor de entrada recebido.
*   `balance_value` (REAL): Valor restante pendente de quitação.
*   `parts_left` (TEXT): JSON array contendo as peças que o cliente deixou na retífica.
*   `additional_parts` (TEXT): JSON array com as peças adicionadas pela retífica.
*   `services` (TEXT): JSON com a lista de serviços (`id`, `name`, `value`, `quantity`, `measure`, `motorId`). O `motorId` liga o serviço a um motor da O.S.: é o índice do motor em `motor_model` (`'0'`, `'1'`, ...) ou `'all'` quando o serviço vale para todos.
*   `discount` (REAL): Desconto concedido no valor total.
*   `total_value` (REAL): Valor total bruto dos serviços.
*   `net_value` (REAL): Valor líquido total (total - desconto).
*   `finished` (INTEGER): Flag binária indicando se a O.S. foi fechada.
*   `finished_at` (TEXT): Data/Hora de encerramento da O.S.
*   `delivery_date` (TEXT): Data prevista/efetiva de entrega.
*   `arrival_date` (TEXT): Data de entrada do motor na oficina.
*   `observations` (TEXT): Notas e observações gerais.
*   `payment_entries` (TEXT): Histórico JSON detalhado de pagamentos efetuados (datas, valores, métodos de pagamento).
*   `concluded_index` (INTEGER): Ordem de conclusão das O.S. finalizadas.
*   `status_observation` (TEXT): Observação ligada ao status.
*   `deleted_at` (TEXT): Reservado para exclusão lógica (as consultas ignoram O.S. com valor preenchido).

### 4.3. Preços de Motores (`motor_services_prices`)
Permite associar valores fixos personalizados para tipos de motores específicos.
*   `id` (TEXT, PK): Identificador único.
*   `motor_id` (TEXT): Nome do motor (normalizado em letras maiúsculas).
*   `service_id` (TEXT): Identificador do serviço (do catálogo ou de `custom_services`).
*   `sub_name` (TEXT): Subdivisão do serviço (ex: *Standard*, *0.25*).
*   `price` (REAL): Preço customizado do serviço para aquele motor.
*   `observation` (TEXT): Nota sobre a precificação daquele serviço.

### 4.4. Pagamentos Agrupados
Permite quitar várias O.S. de um mesmo cliente com um único pagamento.
*   `pagamentos_agrupados`: `id`, `cliente_id`, `valor_total`, `valor_pago`, `status` (`aguardando_pagamento`, `pagamento_parcial`, `pago`), `created_at`, `updated_at`.
*   `pagamento_agrupado_os`: vínculo entre o grupo e as O.S. (`pagamento_agrupado_id`, `os_id`, `created_at`).
*   `entradas_pagamento_agrupado`: lançamentos do grupo (`id`, `pagamento_agrupado_id`, `valor`, `data`, `forma_pagamento`, `nome_pagador`, `observacao`, `created_at`).

### 4.5. Tabelas Auxiliares
*   `motores` & `modelos`: Listagem rápida para autocompletar modelos e cilindradas durante o preenchimento de O.S.
*   `custom_services`: Catálogo básico de serviços gerais da oficina para precificação base.
*   `settings`: Chaves e valores de configurações locais persistidas no banco.

---

## 5. Comunicação Inter-Processos (IPC)

Como o Next.js roda sob isolamento de contexto para segurança da janela do Electron, toda a comunicação com o Node.js e banco de dados SQLite é feita via canal IPC exposto pelo arquivo `preload.js`:

```javascript
// Exposição segura de APIs na Main World (window.electronAPI)
contextBridge.exposeInMainWorld('electronAPI', {
  dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  dbRun: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  print: (options) => ipcRenderer.invoke('print-window', options),
  printToPDF: (defaultName) => ipcRenderer.invoke('print-to-pdf', defaultName)
});
```

*   `dbQuery`: Usado pelo frontend para realizar buscas (retorna array de objetos).
*   `dbRun`: Usado para inserções, atualizações e deleções locais.
*   `print` / `printToPDF`: Disparam os fluxos nativos de impressão da janela de visualização atual ou geram o relatório em PDF.

---

## 6. Layout, UI/UX e Styling

O visual do aplicativo foi desenvolvido seguindo padrões modernos e focando na produtividade do operador da retífica.

### Diretrizes de UI/UX:
1.  **Vibe Premium e Dark Mode**: Cores baseadas em HSL customizados com suporte perfeito para Dark/Light Mode coordenados via `next-themes`.
2.  **Tipografia**: Google Fonts integrada (Inter/Outfit) para legibilidade de fichas técnicas complexas e valores financeiros.
3.  **Zoom Fixo 1:1**: No processo principal (`main.js`), as APIs de zoom visual da janela são limitadas a `(1, 1)` para impedir desconfiguração do layout da O.S. e manter pixels nítidos.
4.  **Feedback Dinâmico**: Transições de visualização animadas com o componente `AnimatePresence` do *Framer Motion*, e avisos de status acionados via biblioteca de toasts `sonner`.
5.  **Acessibilidade de Escala**: Ajuste flexível do tamanho da fonte da aplicação (`--system-font-size` reativo de 12px a 20px) armazenado no `localStorage`, permitindo que operadores leiam mais confortavelmente em telas de diferentes resoluções.
