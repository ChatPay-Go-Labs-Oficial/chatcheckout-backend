# Architecture

The project follows the modular architecture provided by NestJS, promoting separation of concerns and scalability.

## Core Modules

The application is divided into several feature modules:

### 1. Auth Module (`src/auth`)
Handles all authentication-related logic.
*   **Strategies:** Implements `JwtStrategy` for validating bearer tokens.
*   **Guards:** `JwtAuthGuard` for protecting routes.
*   **Services:** `AuthService` for login/register logic, `TokenBlacklistService` for managing revoked tokens using Redis.

### 2. User Module (`src/user`)
Manages user data.
*   **Entity:** `User` entity representing the users table.
*   **Controller:** Endpoints for user profile and management.
*   **Service:** Business logic for user CRUD operations.

### 3. Product Module (`src/product`)
Manages the product catalog.
*   **Entity:** `Product` entity.
*   **Service:** `ProductService` for CRUD, `ProductHashService` for generating secure hashes for products (likely for shareable links).
*   **Controller:** Endpoints to list, create, update, and delete products.

### 4. Upload Module (`src/upload`)
Handles file uploads.
*   **Service:** Integrates with Cloudflare R2 (S3-compatible) to upload files.
*   **Controller:** Endpoint to receive files (via `Multer`) and return the public URL.

### 5. Chat AI Module (`src/chat-ai`)
Facilitates communication with the AI service.
*   **Service:** Communicates with an external Python API (`PYTHON_API_URL`) to process chat messages.

### 6. Payment & Stripe Modules (`src/payment`, `src/stripe`)
Handles payment processing and marketplace logic.
*   **Stripe Service:** Wraps Stripe API calls (Account creation, Payment Intents).
*   **Payment Controller:** Endpoints for onboarding sellers and processing payments.
*   **Flow:** Uses Stripe Connect (Express) for seller onboarding and split payments.

### 7. Common Module (`src/common`)
Contains shared utilities across the application.
*   **Filters:** Global `HttpExceptionFilter` for consistent error responses.
*   **Decorators:** Custom decorators (e.g., for getting current user).
*   **Validators:** Custom validation logic.

## Database Architecture

*   **PostgreSQL:** The primary relational database.
*   **TypeORM:** Used for data access. Configuration is located in `src/config/typeorm.config.ts`.
*   **Migrations:** Database schema changes are managed via migrations in `src/migrations`.

## Caching & State

*   **Redis:** Used for:
    *   **Token Blacklist:** Storing revoked JWT tokens until they expire.
    *   **Caching:** (Potential use) Caching frequent responses.

## Security Layers

1.  **Throttling:** `@nestjs/throttler` is used to limit the number of requests from a single IP to prevent brute-force attacks.
2.  **Validation:** `class-validator` and `class-transformer` ensure incoming data meets the DTO specifications.
3.  **CORS:** Enabled globally to allow cross-origin requests (configured in `main.ts`).
4.  **Password Hashing:** `bcrypt` is used to hash user passwords before storage.

## Infrastructure

The `docker-compose.yml` file provisions:
*   **PostgreSQL Container:** Port 5432.
*   **Redis Container:** Port 6379.
