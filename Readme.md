# MilesAhead Server

The **MilesAhead Server** is the backend for the MilesAhead Marathon Website. It provides a robust API for managing marathon data, user registrations, and authentication, ensuring smooth interaction between the frontend and the database.

## Features

- **Authentication**: 
  - JSON Web Token (JWT)-based authentication.
  - Secure token storage in HTTP-only cookies.
  - Middleware for verifying and decoding user tokens.

- **Marathon Management**:
  - Add new marathons.
  - Update marathon details.
  - Delete marathons.
  - Retrieve paginated and sorted marathon lists.
  - Fetch details of a specific marathon.

- **User Registrations**:
  - Apply for marathons with registration validation to prevent duplicates.
  - Update user registration details.
  - Delete user registrations.

- **Upcoming Events**:
  - Retrieve a list of upcoming marathons.

- **Pagination and Sorting**:
  - Pagination for large marathon datasets.
  - Sorting options by creation date and registration date.

- **Creator-Specific Features**:
  - Fetch marathons created by a specific user, with token-based authorization.

- **Search and Filters**:
  - Search for applied marathons using keywords.

- **Error Handling**:
  - Comprehensive error handling for unauthorized access, forbidden actions, and data retrieval failures.

## API Endpoints

### Authentication Routes
- **POST `/jwt`**: Generate a JWT token and set it in cookies.
- **GET `/clearCookie`**: Clear the JWT token cookie.

### Marathon Routes
- **POST `/add-marathon`**: Add a new marathon.
- **PATCH `/update-marathon/:id`**: Update an existing marathon.
- **DELETE `/delete/my-marathon/:id`**: Delete a specific marathon.
- **GET `/marathons`**: Fetch a paginated list of marathons with sorting options.
- **GET `/marathons/details/:id`**: Retrieve details of a specific marathon.
- **GET `/my-marathons/:email`**: Get marathons created by a specific user (requires token verification).

### Registration Routes
- **POST `/apply-marathons`**: Apply for a marathon with duplicate entry checks.
- **PATCH `/update-apply/marathon/:id`**: Update user registration details.
- **DELETE `/delete/my-registration/:id`**: Delete a specific registration.
- **GET `/my-applied/marathons/:email`**: Get applied marathons for a specific user (requires token verification).

### Event Routes
- **GET `/upcoming-event`**: Fetch a list of upcoming marathons.

### Utility Routes
- **GET `/pagination`**: Get the total count of marathon documents for pagination purposes.

## Technologies Used

- **Node.js**: Backend runtime environment.
- **Express**: Web framework for building APIs.
- **MongoDB**: Database for storing marathon and user data.
- **JWT (jsonwebtoken)**: For authentication and token verification.
- **cookie-parser**: Middleware for parsing cookies.
- **dotenv**: For managing environment variables.
- **cors**: Middleware for handling Cross-Origin Resource Sharing (CORS).

## Middleware

- **CORS Configuration**: Configured for specified origins and credentials.
- **JWT Verification**: Middleware to protect sensitive routes by validating tokens.
- **Express JSON Parsing**: Automatically parses incoming JSON payloads.

## Environment Variables

The following environment variables are required for proper functionality:

- `VITE_USER`: MongoDB username.
- `VITE_PASS`: MongoDB password.
- `VITE_USER_SECRET`: Secret key for signing JWT tokens.
- `NODE_ENV`: Environment mode (`development` or `production`).