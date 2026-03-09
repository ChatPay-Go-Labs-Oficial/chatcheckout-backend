# Project Overview

**ChatCheckout Backend** is a robust API built with [NestJS](https://nestjs.com/) designed to power a conversational e-commerce platform. It provides essential services for user management, product cataloging, file uploads, and AI-driven chat interactions.

## Key Features

*   **Authentication & Authorization:** Secure JWT-based authentication with role-based access control.
*   **User Management:** Registration, profile management, and role handling.
*   **Product Management:** CRUD operations for products, including secure hash generation for product links.
*   **File Uploads:** Integration with Cloudflare R2 for handling product images and other assets.
*   **Payment Processing:** Integrated with Stripe Connect for split payments and marketplace functionality.
*   **AI Chat Integration:** Connects with an external Python AI service to provide conversational capabilities.
*   **Security:** Implements rate limiting (Throttling), password hashing (Bcrypt), and input validation.
*   **Documentation:** Auto-generated API documentation using Swagger.

## Technology Stack

*   **Framework:** [NestJS](https://nestjs.com/) (Node.js) - A progressive Node.js framework for building efficient, reliable and scalable server-side applications.
*   **Language:** [TypeScript](https://www.typescriptlang.org/) - Strongly typed superset of JavaScript.
*   **Database:** [PostgreSQL](https://www.postgresql.org/) - Powerful, open source object-relational database system.
*   **ORM:** [TypeORM](https://typeorm.io/) - ORM for TypeScript and JavaScript (ES7, ES6, ES5).
*   **Caching & Session:** [Redis](https://redis.io/) - In-memory data structure store, used for caching and token blacklisting.
*   **Containerization:** [Docker](https://www.docker.com/) & Docker Compose - For orchestrating the database and Redis services.
*   **Cloud Storage:** [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) - S3-compatible object storage for uploaded files.
*   **Payments:** [Stripe](https://stripe.com/) - Payment processing platform for internet businesses.
*   **API Documentation:** [Swagger](https://swagger.io/) (OpenAPI) - For documenting RESTful APIs.

## External Services

*   **Python Chat API:** An external service (configurable via env) that handles the core AI logic for chat interactions.
