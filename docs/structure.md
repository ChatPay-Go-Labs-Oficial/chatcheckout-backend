# Project Structure

This document explains the organization of the source code in the `src` directory.

```
src/
├── app.controller.ts       # Basic application controller
├── app.module.ts           # Root module of the application
├── app.service.ts          # Basic application service
├── main.ts                 # Entry point of the application
├── test-setup.ts           # Test setup configuration
│
├── auth/                   # Authentication Module
│   ├── dto/                # Data Transfer Objects for Auth (Login, Register)
│   ├── guards/             # Auth guards (JwtAuthGuard)
│   ├── auth.controller.ts  # Auth endpoints
│   ├── auth.module.ts      # Auth module definition
│   ├── auth.service.ts     # Auth business logic
│   ├── jwt.strategy.ts     # Passport JWT strategy
│   └── token-blacklist...  # Service for managing revoked tokens
│
├── chat-ai/                # Chat AI Module
│   ├── dto/                # DTOs for chat interactions
│   ├── chat-ai.controller.ts
│   ├── chat-ai.module.ts
│   └── chat-ai.service.ts  # Integration with Python AI API
│
├── common/                 # Shared Resources
│   ├── decorators/         # Custom decorators (e.g., @CurrentUser)
│   ├── filters/            # Exception filters (HttpExceptionFilter)
│   ├── utils/              # Utility functions
│   └── validators/         # Custom validators
│
├── config/                 # Configuration
│   ├── redis.module.ts     # Redis configuration module
│   ├── redis.service.ts    # Redis service wrapper
│   └── typeorm.config.ts   # TypeORM database configuration
│
├── migrations/             # Database Migrations
│   └── ...ts               # Timestamped migration files
│
├── payment/                # Payment Module
│   ├── dto/                # DTOs for payments
│   ├── payment.controller.ts
│   ├── payment.module.ts
│   └── payment.service.ts  # Payment business logic
│
├── product/                # Product Module
│   ├── dto/                # DTOs for Product CRUD
│   ├── product.controller.ts
│   ├── product.entity.ts   # Product database entity
│   ├── product.module.ts
│   ├── product.service.ts
│   └── product-hash...     # Service for product hash generation
│
├── upload/                 # Upload Module
│   ├── pipes/              # Pipes for file validation
│   ├── upload.controller.ts
│   ├── upload.module.ts
│   └── upload.service.ts   # Cloudflare R2 integration
│
├── stripe/                 # Stripe Integration Module
│   ├── stripe.module.ts
│   └── stripe.service.ts   # Wrapper for Stripe SDK
│
└── user/                   # User Module
    ├── dto/                # DTOs for User management
    ├── validators/         # User-specific validators
    ├── user.controller.ts
    ├── user.entity.ts      # User database entity
    ├── user.module.ts
    ├── user.service.ts
    └── user-role.enum.ts   # User roles definition
```

## Key Directories

*   **`src/migrations`**: Contains all database schema changes. Use `npm run migration:generate` to create new ones.
*   **`src/common`**: Place reusable code here to avoid duplication across modules.
*   **`src/config`**: Centralized configuration logic.
