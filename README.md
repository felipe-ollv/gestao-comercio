# Gestão Comércio

Sistema de gestão para comercio com frontend React/Vite, backend Quarkus, MySQL e Docker Compose.

## Rodar com Docker

```bash
docker compose up -d --build
```

Acesse:

- Frontend: http://localhost
- Backend health: http://localhost/api/health

O primeiro acesso deve ser feito em **Novo Comércio**, na tela de login. Esse cadastro cria o comercio e o usuário gestor.

## Serviços

- `db`: MySQL 8 com schema inicial em `scripts_sql/01_init_db.sql`
- `backend`: Quarkus JVM exposto em `8080`
- `frontend`: Nginx servindo o build Vite e fazendo proxy de `/api/*` para o backend

## Comandos úteis

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```

Para rodar só o build local do frontend:

```bash
npm install
npm run build
```

## Atualização de banco existente

Os scripts em `scripts_sql` são executados automaticamente apenas quando o volume do MySQL é criado. Para atualizar uma instalação que já possui dados, aplique a migração de histórico de recebimentos antes de iniciar a nova versão do backend:

```bash
docker compose exec -T db sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < scripts_sql/14_add_comanda_payment_history.sql
```

A migração preserva os valores pagos existentes como registros `MIGRADO`, com forma de pagamento `NAO_INFORMADA`, pois essas informações não existiam no modelo anterior.
