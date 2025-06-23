# Auto Social

A social media management tool to create, schedule, and publish content.

## Core Features

-   **Authentication:** Email/password and OAuth for social platforms.
-   **Platform Management:** Connect and manage multiple social media accounts.
-   **AI-Powered Content Creation:** Generate and improve posts with AI assistance.
-   **Scheduling:** Plan and schedule posts using a calendar view.
-   **History & Context:** Maintain a timeline of past posts to inform AI tone and style.

## Getting Started

1.  **Clone the repository and install dependencies:**
    ```bash
    git clone <repository-url>
    cd better-plan
    pnpm install
    ```

2.  **Create your environment file:**

    Create a file named `.env` in the root of the project and add the following variables.

    ```env
    # Database connection
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=postgres
    POSTGRES_DB=better-plan

    # Public URL of your application
    APP_URL=http://localhost:3000

    # Secret key for signing authentication tokens
    BETTER_AUTH_SECRET=

    # X/Twitter API credentials (optional)
    # X_CLIENT_ID=
    ```

3.  **Start the development database:**
    ```bash
    pnpm db:up
    ```

4.  **Run the application:**
    ```bash
    pnpm dev
    ```

## Deployment

This application is containerized for production deployment using Docker.

1.  **Build the application image:**
    ```bash
    pnpm docker:build
    ```
2.  **Start the services in the background:**
    ```bash
    pnpm docker:up
    ```

## Available Scripts

-   `pnpm dev`: Start the development server.
-   `pnpm build`: Build the application for production.
-   `pnpm start`: Start the production server.
-   `pnpm lint`: Lint and format the codebase.
-   `pnpm db:up`: Start the development database container.
-   `pnpm db:down`: Stop the development database container.
-   `pnpm db:generate`: Generate database migrations.
-   `pnpm docker:build`: Build the production Docker image.
-   `pnpm docker:up`: Start production containers.
-   `pnpm docker:down`: Stop production containers.
