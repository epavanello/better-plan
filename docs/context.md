# Project Context: `BETTER-PLAN.`

### 1. Goal & Tech Stack
- **Objective**: MVP of a social media management tool to connect accounts, create, and schedule posts.
- **Initial Platform**: X (Twitter).
- **Tech Stack**: TanStack Start, Drizzle ORM (PostgreSQL), Tailwind CSS, Shadcn/ui, and `better-auth` for user authentication.

### 2. Backend & Database Structure
- **Schema**: A Drizzle schema is defined in `integrations-schema.ts` for an `integrations` table. It's designed to store multiple platform credentials per user. For X, the `accessToken` column stores the OAuth 1.0a `accessToken` and `accessSecret` concatenated with a colon (e.g., `"token:secret"`).
- **Server-side Logic**:
  - `functions/`: Contains RPC-style server functions (`createServerFn`) called from the client (e.g., fetching data, starting auth flow).
  - `app/routes/api/`: Contains standard API endpoints and webhooks, specifically used for the OAuth callback from X.
- **Key Libraries**: `twitter-api-v2` for X integration, `ulid` for generating unique IDs.

### 3. Core Feature: X (Twitter) Integration
The authentication flow uses **OAuth 1.0a**, providing non-expiring tokens. The implementation is confirmed to be working and follows this two-step process:

**Step 1: Initiating Authorization**
- **Trigger**: The user clicks a button on the `/app/integrations` page.
- **Action**: A `useMutation` hook calls the `startXAuthorization` server function located in `functions/auth/x-start-auth.ts`.
- **Server Function Logic**:
    1. Uses `twitter-api-v2` to generate an authentication URL and temporary `oauth_token` / `oauth_token_secret`.
    2. Returns a JSON response containing the `url` and a `Set-Cookie` header with the temporary tokens stored in a cookie named `x_oauth_token`.
- **Client-side Handling**: The `onSuccess` callback of `useMutation` manually sets the cookie on the browser and redirects the user to the auth URL provided by the server function.

**Step 2: Handling the Callback**
- **Endpoint**: A dedicated API route at `app/routes/api/auth/x/callback.ts`.
- **Logic**:
    1. Receives the redirect from X with `oauth_token` and `oauth_verifier` in the URL query.
    2. Reads the temporary tokens from the `x_oauth_token` cookie to validate the request's origin.
    3. Uses `twitter-api-v2`'s `.login()` method to exchange the temporary tokens for permanent `accessToken` and `accessSecret`.
    4. Fetches the current app user's session with `auth.api.getSession()`.
    5. Saves the new integration (including platform ID, username, and permanent tokens) to the database, linked to the app user's ID.
    6. Redirects the user back to the `/app/integrations` page.

### 4. Environment
- The application requires a `.env` file with `X_CLIENT_ID`, `X_CLIENT_SECRET`, and `APP_URL` (e.g., `http://localhost:3000`).