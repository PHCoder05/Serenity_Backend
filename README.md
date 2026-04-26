# Serenity Backend API

Efficient and robust REST API built with NestJS.

## Features

- [x] **Database:** Support for [TypeORM](https://www.npmjs.com/package/typeorm) and [Mongoose](https://www.npmjs.com/package/mongoose).
- [x] **Prisma:** Integration with [Prisma](https://www.prisma.io/) and Postgres adapter.
- [x] **Seeding:** Automated data seeding.
- [x] **Configuration:** Secure config management via `@nestjs/config`.
- [x] **Mailing:** Email service using [Nodemailer](https://www.npmjs.com/package/nodemailer).
- [x] **Authentication:** 
  - Email sign-in and sign-up.
  - Social login support (Apple, Facebook, Google).
  - JWT-based session management.
- [x] **RBAC:** Admin and User role-based access control.
- [x] **I18N:** Internationalization and translations support.
- [x] **File Management:** Local and Amazon S3 file upload drivers.
- [x] **Documentation:** Interactive API documentation with [Swagger](https://swagger.io/).
- [x] **Testing:** Comprehensive E2E and unit tests.
- [x] **Docker:** Fully containerized development and CI environments.

## Getting Started

### Prerequisites

- Node.js (>= 16.0.0)
- pnpm (>= 8.0.0)
- Docker (optional, for containerized run)

### Installation

```bash
pnpm install
```

### Running the App

```bash
# development
pnpm run start:dev

# production mode
pnpm run start:prod
```

### Database Migrations

```bash
pnpm run migration:run
```

### Seeding

```bash
pnpm run seed:run:relational
```

## API Documentation

Once the app is running, you can access the Swagger documentation at:
`http://localhost:3000/docs`

## License

MIT
