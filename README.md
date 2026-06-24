# Sistema de Ativacao de Motos

Sistema web local para substituir a planilha Excel compartilhada usada no cadastro e acompanhamento de ativacoes/preparacoes de motos em oficina.

## O que o sistema entrega

- Backend com `FastAPI` e API REST.
- Banco `SQLite` com estrutura simples de migrar depois para PostgreSQL ou MySQL.
- Cadastro completo de ativacoes.
- Tela de vendedores com formulario, filtros, edicao e listagem responsiva.
- Tela de mecanicos com mudanca de status e atualizacao automatica sem recarregar a pagina.
- Painel do dia com contadores, separacao por status e destaque de atrasos/proximidade de horario.
- Registro de quem alterou e quando alterou.

## Estrutura de pastas

```text
ATIVACAO/
|-- backend/
|   `-- app/
|       |-- main.py
|       |-- config.py
|       |-- database.py
|       |-- schemas.py
|       |-- routes/
|       `-- services/
|-- database/
|   `-- schema.sql
|-- data/
|-- frontend/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- scripts/
|   |-- init_db.py
|   `-- start_server.ps1
`-- requirements.txt
```

## Requisitos

- Windows com Python 3.10+ instalado
- Acesso de rede local entre os computadores

## Instalacao

### Opcao 1: script automatico no PowerShell

1. Abra o PowerShell na pasta do projeto.
2. Execute:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\start_server.ps1
```

O script cria um ambiente virtual, instala dependencias, inicializa o banco e sobe o servidor na porta `1234`.
Depois da primeira instalacao, ele pula o `pip install` automaticamente para evitar excesso de arquivos temporarios no servidor.

### Limpeza rapida se o servidor travar

Com o servidor parado, execute:

```powershell
.\scripts\cleanup_runtime.ps1
```

Esse script remove apenas arquivos temporarios do proprio sistema, como `*.db-wal`, `*.db-shm`, `*.db-journal` e logs locais. Ele nao apaga `data\activations.db`.

### Opcao 2: instalacao manual

1. Criar ambiente virtual:

```powershell
py -3.10 -m venv .venv
```

2. Ativar o ambiente:

```powershell
.\.venv\Scripts\Activate.ps1
```

3. Instalar dependencias:

```powershell
pip install -r requirements.txt
```

4. Criar as tabelas:

```powershell
python .\scripts\init_db.py
```

5. Iniciar o servidor:

```powershell
uvicorn backend.app.main:app --host 0.0.0.0 --port 1234
```

## Como acessar na rede local

- Endereco desejado: `http://ativacaooficina:1234`
- Endereco alternativo no servidor local: `http://localhost:1234`
- Endereco alternativo por IP: `http://IP-DO-SERVIDOR:1234`

Para descobrir o IP do servidor no Windows:

```powershell
ipconfig
```

Procure o endereco IPv4 da placa de rede local.

Se os outros computadores nao conseguirem abrir o sistema, verifique se a porta `1234` esta liberada no firewall do Windows.

## Sobre o nome `ativacaooficina`

O sistema agora sobe na porta `1234`, mas para abrir exatamente `http://ativacaooficina:1234` a rede precisa conseguir resolver o nome `ativacaooficina`.

Voce pode fazer isso de uma destas formas:

- Definir `ativacaooficina` como nome da maquina servidora na rede.
- Criar um registro DNS interno apontando `ativacaooficina` para o IP do servidor.
- Em ambiente pequeno, adicionar no arquivo `hosts` de cada computador da oficina uma linha como:

```text
192.168.0.10  ativacaooficina
```

Troque `192.168.0.10` pelo IP real do servidor.

## Funcionalidades por tela

### Painel do dia

- Mostra todas as ativacoes da data selecionada.
- Exibe contadores por status.
- Destaca ativacoes atrasadas.
- Destaca ativacoes com horario para a proxima hora.

### Vendedores

- Cadastram nova ativacao.
- Filtram por data, vendedor, status e chassi.
- Editam registros ainda nao finalizados.
- Excluem registros nao finalizados.

### Mecanicos

- Visualizam a fila da data.
- Atualizam status para `Pendente`, `Em andamento`, `Finalizado` ou `Cancelado`.
- Registram observacao do mecanico.
- Recebem atualizacao automatica da lista a cada 15 segundos.

## API REST principal

### Healthcheck

```http
GET /api/health
```

### Listar ativacoes

```http
GET /api/activations?activation_date=2026-06-16&seller=Joao&status=Pendente&chassis=9C2
```

### Buscar uma ativacao

```http
GET /api/activations/{id}
```

### Criar ativacao

```http
POST /api/activations
Content-Type: application/json
```

Exemplo:

```json
{
  "motorcycle_model": "CG 160 Fan",
  "chassis": "9C2KC2200GR000001",
  "order_date": "2026-06-14",
  "seller": "Joao",
  "activation_date": "2026-06-16",
  "activation_time": "09:30",
  "client_name": "Maria Silva",
  "client_cpf": "12345678900",
  "notes": "Entregar com tanque abastecido",
  "mechanic_notes": "",
  "status": "Pendente",
  "changed_by": "Joao"
}
```

### Editar ativacao

```http
PUT /api/activations/{id}
Content-Type: application/json
```

### Atualizar status

```http
PATCH /api/activations/{id}/status
Content-Type: application/json
```

Exemplo:

```json
{
  "status": "Em andamento",
  "mechanic_notes": "Conferencia iniciada",
  "changed_by": "Carlos Oficina"
}
```

### Excluir ativacao

```http
DELETE /api/activations/{id}?changed_by=Joao
```

### Historico de alteracoes

```http
GET /api/activations/{id}/history
```

## Banco e auditoria

- O banco fica em `data/activations.db`.
- Cada alteracao atualiza imediatamente o registro principal.
- O sistema guarda `created_at`, `updated_at`, `created_by` e `last_changed_by`.
- O historico completo fica na tabela `activation_history`.

## Evolucao futura

Para migrar depois para PostgreSQL ou MySQL, a API ja esta separada em:

- configuracao
- acesso ao banco
- schemas
- servicos
- rotas

O ponto principal da futura migracao sera trocar a camada de persistencia, preservando o restante da aplicacao.
