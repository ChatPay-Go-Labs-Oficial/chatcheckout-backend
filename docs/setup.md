# Setup & Installation

Follow these steps to set up the project locally.

## Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [npm](https://www.npmjs.com/)
*   [Docker](https://www.docker.com/) & Docker Compose

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd chatcheckout-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

1.  **Environment Variables:**
    Copy the example environment file to create your local configuration:
    ```bash
    cp .env.example .env
    ```

2.  **Edit `.env`:**
    Open `.env` and configure the variables.
    *   **Database:** Ensure `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD` match your Docker or local Postgres setup.
    *   **Redis:** Ensure `REDIS_HOST`, `REDIS_PASSWORD` match.
    *   **JWT:** Set a strong `JWT_SECRET`.
    *   **Cloudflare R2:** Configure R2 storage for file uploads:
        *   `R2_ACCOUNT_ID`: Your Cloudflare account ID (found in R2 dashboard)
        *   `R2_ACCESS_KEY_ID`: R2 API token access key
        *   `R2_SECRET_ACCESS_KEY`: R2 API token secret
        *   `R2_BUCKET_NAME`: Name of your R2 bucket (e.g., `chatcheckout-uploads`)
        *   `R2_PUBLIC_URL`: Public URL for your bucket (e.g., `https://your-bucket.r2.dev`)
        
        **To obtain R2 credentials:**
        1. Go to Cloudflare Dashboard > R2
        2. Create a bucket
        3. Generate API token with Read & Write permissions
        4. Configure public access if needed
    *   **Product Hash:** Set `PRODUCT_HASH_SECRET`.

## Running Infrastructure

Start the required databases (Postgres and Redis) using Docker Compose:

```bash
docker-compose up -d
```

## Database Migrations

Once the database is running, apply the migrations to create the schema:

```bash
npm run migration:run
```

## Running the Application

*   **Development Mode:**
    ```bash
    npm run start:dev
    ```
    The server will start at `http://localhost:3000` (or the port defined in `.env`).

*   **Production Mode:**
    ```bash
    npm run build
    npm run start:prod
    ```

## API Documentation

Once the server is running, you can access the Swagger UI documentation at:

```
http://localhost:3000/api
```

## Testing

*   **Unit Tests:**
    ```bash
    npm test
    ```

*   **E2E Tests:**
    ```bash
    npm run test:e2e
    ```

*   **Test Coverage:**
    ```bash
    npm run test:cov
    ```
