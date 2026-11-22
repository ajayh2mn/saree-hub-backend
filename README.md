# SareeHub Backend

The SareeHub backend provides the REST API and PostgreSQL persistence used by the Kamachi Silks admin dashboard. It is built with Express and TypeScript, validates request bodies with Zod, and accesses the database through Prisma.

## Technologies

- Node.js and TypeScript (ES modules)
- Express 5
- PostgreSQL
- Prisma ORM and Prisma Migrate
- Zod validation
- Helmet, CORS, and `express-rate-limit`
- `tsx` for the development server

## Prerequisites

- Node.js and npm
- PostgreSQL

## Installation

From PowerShell, open the backend folder and install the locked dependencies:

```powershell
Set-Location E:\Business\sareehub\backend
npm ci
```

Create a local `.env` file in this folder. It is excluded from Git. Set `DATABASE_URL` to your PostgreSQL connection string. Do not commit credentials or secrets.

## PostgreSQL setup

Create a local database (adjust the PostgreSQL account for your installation):

```powershell
psql -U postgres -c "CREATE DATABASE sareehub;"
```

Set `DATABASE_URL` in `backend/.env` to connect to that database. Prisma expects a PostgreSQL URL with the `public` schema, for example a URL following this format:

```text
postgresql://<user>:<password>@localhost:5432/sareehub?schema=public
```

The placeholders above are not real credentials. Keep the actual connection string in the ignored `.env` file.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection used by Prisma. |
| `PORT` | No | HTTP port. Defaults to `5000`. |
| `FRONTEND_URL` | No | Allowed browser origin for CORS. Defaults to `http://localhost:5173`. |
| `JWT_SECRET` | Yes for authentication | JWT signing secret; configure a cryptographically random value of at least 32 characters. |
| `ADMIN_NAME` | Provisioning only | Initial administrator's display name. |
| `ADMIN_EMAIL` | Provisioning only | Initial administrator's login email. |
| `ADMIN_PASSWORD` | Provisioning only | Initial administrator's password (at least 12 characters and at most 72 UTF-8 bytes). Never commit or log it. |
| `STAFF_NAME` | Provisioning only | Staff account display name. |
| `STAFF_EMAIL` | Provisioning only | Staff account login email. |
| `STAFF_PASSWORD` | Provisioning only | Staff account password (at least 12 characters and at most 72 UTF-8 bytes). Never commit or log it. |

The server loads `.env` through `dotenv/config`. Copy `.env.example` to `.env` and replace placeholders with local values; never commit `.env`. Provisioning variables are only needed when creating ADMIN or STAFF accounts.

## Authentication and authorization

The API uses bcrypt-hashed passwords and signed JWT access tokens. `POST /api/auth/login` issues a token valid for one hour. Send it on protected requests as `Authorization: Bearer <token>`. `POST /api/auth/me` returns the active authenticated user's basic details. There is no public registration endpoint.

Every product, category, variety, inventory, supplier, purchase-order, and purchase-receipt endpoint requires authentication. Requests without a valid token receive `401`; authenticated users without permission receive `403`.

| Role | Permissions |
|---|---|
| `ADMIN` | Full access to implemented business operations; can create purchase orders, change purchase-order status, and manage suppliers. Can receive `Product.costPrice` and purchase-order item `unitCost` in API responses. |
| `STAFF` | Day-to-day product, category, variety, and inventory operations; can view suppliers and purchase orders and create purchase receipts. Cannot create purchase orders, change their status, or manage suppliers. Cost fields are omitted from responses, and STAFF cannot set product cost price. |

User-account management endpoints are not implemented yet. The ADMIN and STAFF provisioning commands below are the available account creation methods.

## Prisma commands

Run these from the backend directory:

```powershell
# Check the Prisma schema
npx prisma validate

# Create and apply a development migration after changing the schema
npx prisma migrate dev --name <migration_name>

# Apply committed migrations in a deployment environment
npx prisma migrate deploy

# Generate the Prisma Client
npx prisma generate
```

The repository includes migrations for the current schema, including the `ProductImage` metadata model. Image upload and management API routes are not implemented yet.

### Provision the initial ADMIN

Set `JWT_SECRET` in `.env` to a strong random secret of at least 32 characters. After applying migrations, set the following temporary process variables in PowerShell and run the provisioning command. It hashes the password, does not print it, and refuses to run if an ADMIN already exists. The password prompt is hidden; clear the variables after provisioning.

```powershell
$env:ADMIN_NAME = "Kamachi Silks Administrator"
$env:ADMIN_EMAIL = "admin@example.com"
$securePassword = Read-Host "Initial administrator password" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
npm run provision:admin
Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
Remove-Variable securePassword
```

Use a unique password of at least 12 characters and no more than 72 UTF-8 bytes (bcrypt's supported input size). The script requires `DATABASE_URL` and `JWT_SECRET` from `.env`. There is no public registration endpoint.

### Provision a STAFF account

After applying migrations, set the temporary STAFF variables in PowerShell and run the provisioning command. The password is entered through a hidden prompt, hashed with bcrypt, and never printed. The script always assigns the STAFF role and refuses duplicate email addresses. Remove the temporary variables after use.

```powershell
$env:STAFF_NAME = "Staff Member"
$env:STAFF_EMAIL = "staff@example.com"
$securePassword = Read-Host "Staff account password" -AsSecureString
$env:STAFF_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
npm run provision:staff
Remove-Item Env:STAFF_NAME, Env:STAFF_EMAIL, Env:STAFF_PASSWORD
Remove-Variable securePassword
```

Use a unique password of at least 12 characters and no more than 72 UTF-8 bytes (bcrypt's supported input size). The script requires `DATABASE_URL` from `.env`.

## Development and production

```powershell
# Run the development server with watch mode
npm run dev

# Compile TypeScript to dist/
npm run build

# Start the compiled server
npm start

# Type-check without emitting files
npm run typecheck
```

The server connects to PostgreSQL before listening. The default local API address is `http://localhost:5000`.

## API endpoints

All routes are JSON APIs under `/api` unless noted. Request bodies are validated where the corresponding route uses a validator; successful responses generally use a `{ success, message?, data }` envelope.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | API health check. |
| `POST` | `/api/auth/login` | Authenticate with email and password; returns a one-hour JWT and basic user details. |
| `POST` | `/api/auth/me` | Return the authenticated user's basic details; requires `Authorization: Bearer <token>`. |
| `GET` | `/api/products` | List products with category and variety details. |
| `POST` | `/api/products` | Create a product; the product code is generated by the backend. |
| `PATCH` | `/api/products/:id` | Partially update product fields, including `isActive`. |
| `GET` | `/api/categories` | List categories with variety and product counts. |
| `POST` | `/api/categories` | Create a category. |
| `PATCH` | `/api/categories/:id` | Rename a category. |
| `PATCH` | `/api/categories/:id/status` | Activate or deactivate a category. |
| `GET` | `/api/varieties?categoryId=:categoryId` | List varieties for a category. |
| `POST` | `/api/varieties` | Create a variety. |
| `PATCH` | `/api/varieties/:id` | Rename a variety. |
| `PATCH` | `/api/varieties/:id/status` | Activate or deactivate a variety. |
| `POST` | `/api/inventory/units` | Add unique-piece inventory. |
| `GET` | `/api/inventory/products/:productId/units` | List a product's inventory units. |
| `POST` | `/api/inventory/bulk` | Add bulk stock. |
| `GET` | `/api/inventory/bulk/:productId` | Get bulk stock batches and total. |
| `POST` | `/api/inventory/bulk/deduct` | Deduct bulk stock. |
| `POST` | `/api/purchase-orders` | Create a purchase order. |
| `GET` | `/api/purchase-orders` | List purchase orders. |
| `GET` | `/api/purchase-orders/:id` | Get a purchase order. |
| `PATCH` | `/api/purchase-orders/:id/status` | Change a draft purchase order to ordered or cancelled. |
| `POST` | `/api/purchase-receipts` | Record a purchase receipt; supports request idempotency. |
| `GET` | `/api/suppliers` | List suppliers. |
| `POST` | `/api/suppliers` | Create a supplier. |
| `PATCH` | `/api/suppliers/:id` | Update supplier details. |
| `PATCH` | `/api/suppliers/:id/status` | Activate or deactivate a supplier. |

The API applies Helmet headers, a configurable CORS origin, a 1 MB JSON body limit, and a rate limit of 100 API requests per 15 minutes per client window. Business endpoints require a Bearer token; `/health` and `POST /api/auth/login` are public.

## Implemented backend features

- Product listing, creation, partial editing, and activate/deactivate status updates.
- Category and variety creation, listing, renaming, and status updates.
- Unique-piece inventory and bulk stock management, including bulk deduction.
- Purchase order creation, listing, detail retrieval, and limited status transitions.
- Purchase receipt recording with idempotency handling and inventory creation.
- Supplier creation, listing, editing, and status updates.
- Bcrypt password hashes, one-hour JWTs, active-account checks, and ADMIN/STAFF role-based protection for all implemented business routes.
- Role-based purchase-order and supplier permissions, with cost fields restricted to ADMIN responses.
- PostgreSQL relational schema and versioned Prisma migrations.

## Future development

- Product image upload, listing, primary-image selection, and deletion using Cloudinary. The database metadata foundation exists, but image APIs and storage integration do not.
- ADMIN user-account management endpoints and password-change functionality.
- Sales, customer, and billing APIs; no sales-history models or routes are currently implemented.
- Automated backend test and lint scripts.
