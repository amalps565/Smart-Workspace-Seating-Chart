# Changelog: Backend

All notable changes to the backend (`backend/`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `backend/CLAUDE.md` with the planned commands, structure, and conventions for the Spring Boot backend.
- Spring Boot 4.1 project on Java 21 with the Maven wrapper, with Web MVC, Data JPA, Security, WebSocket, Validation, Flyway, and PostgreSQL. (#1)
- `application.yml` with database settings that can be overridden through environment variables, and a schema owned only by Flyway (`ddl-auto: validate`). (#1)
- Testcontainers PostgreSQL test setup and a smoke test that connects to the database. (#1)
- `docker-compose.yml` with PostgreSQL 17 for local development, and a CI job that runs `./mvnw verify`. (#1)
