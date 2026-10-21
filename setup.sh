set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

TS_VERSION="^6"            # NÃO usar typescript@latest: o 7.x quebra o Nest CLI
PRISMA_VERSION="6.19.3"   
NEST_MAJOR="^11"          

DB_USER="camellia_user"
DB_NAME="camellia_db"
DB_HOST="localhost"
DB_PORT="5432"

say()  { printf "\n\033[1;34m==>\033[0m %s\n" "$1"; }
ok()   { printf "\033[1;32m✔\033[0m %s\n" "$1"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$1"; }
die()  { printf "\033[1;31m✘ %s\033[0m\n" "$1"; exit 1; }

say "Verificando pré-requisitos"
command -v node >/dev/null || die "Node.js não encontrado. Instale em https://nodejs.org (ou: brew install node)"
command -v npm  >/dev/null || die "npm não encontrado."
ok "Node $(node -v) / npm $(npm -v)"

[ -d "$BACKEND" ]  || die "Pasta backend/ não encontrada. Rode o script na raiz do projeto."
[ -d "$FRONTEND" ] || warn "Pasta frontend/ não encontrada (será ignorada)."

if command -v psql >/dev/null; then
  ok "PostgreSQL client encontrado ($(psql --version))"
else
  warn "psql não encontrado. Instale o PostgreSQL (brew install postgresql@16) ou use Docker."
fi

say "Instalando dependências do backend"
cd "$BACKEND"
npm install

say "Fixando versões compatíveis"
npm install -D "typescript@${TS_VERSION}" "prisma@${PRISMA_VERSION}"
npm install "@prisma/client@${PRISMA_VERSION}" \
            "@nestjs/swagger@${NEST_MAJOR}" \
            "@nestjs/jwt@${NEST_MAJOR}" \
            dotenv class-validator class-transformer
ok "TypeScript $(npx tsc -v)"


say "Configurando .env"
if [ -f .env ]; then
  ok ".env já existe, mantendo o arquivo atual"
else
  printf "Senha do usuário '%s' no PostgreSQL (Enter para usar 'postgres123'): " "$DB_USER"
  read -rs DB_PASS; echo
  DB_PASS="${DB_PASS:-postgres123}"

  # codifica caracteres especiais para a URL (@ # / : %)
  ENC_PASS="$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$DB_PASS")"
  JWT_SECRET="$(openssl rand -hex 32)"
  SALT_SECRET="$(openssl rand -hex 32)"

  cat > .env <<EOF
DATABASE_URL="postgresql://${DB_USER}:${ENC_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
JWT_SECRET=${JWT_SECRET}
SALT_SECRET=${SALT_SECRET}
EOF
  ok ".env criado (não suba este arquivo para o git!)"


  if command -v psql >/dev/null; then
    say "Criando usuário e banco no PostgreSQL (se ainda não existirem)"
    psql postgres -v ON_ERROR_STOP=0 <<SQL || warn "Não consegui criar o banco automaticamente. Crie manualmente (veja README)."
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}' CREATEDB;
  END IF;
END \$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
SQL
  fi
fi

for dir in "$ROOT" "$BACKEND"; do
  if [ -f "$dir/.gitignore" ] && ! grep -qx ".env" "$dir/.gitignore"; then
    echo ".env" >> "$dir/.gitignore"
  fi
done

say "Gerando Prisma Client"
rm -rf node_modules/.prisma
npx prisma generate

say "Aplicando migrations"
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  warn "Sem migrations no repositório; rodando 'migrate dev'"
  npx prisma migrate dev --name init
fi
ok "Banco pronto"


if [ -d "$FRONTEND" ]; then
  say "Instalando dependências do frontend"
  cd "$FRONTEND"
  npm install
  ok "Frontend pronto"
fi


cat <<MSG

\033[1;32mTudo pronto!\033[0m

Para rodar:
  Backend : cd backend  && npx prisma generate && npm run start:dev   (http://localhost:3000/api/docs)
  Frontend: cd frontend && npm run dev         (http://localhost:5173)
  Banco   : cd backend  && npx prisma studio   (http://localhost:5555)

MSG