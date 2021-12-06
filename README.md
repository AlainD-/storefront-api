# StoreFront API

RESTful API for the StoreFront application. The API contains endpoints to serve a shopping-like/ecommerce-like application.

It powers RESTfull API endpoints through Express, JW capabilities for authentication and authorization, PostgreSQL database communication.

## Installation

### Environment Setup

#### SSH key pair

In order to use the JWT capability a mandatory SSH key pair is required.
To generate a new key pair, you can use for instance:

```bash
ssh-keygen -t rsa -P "" -b 4096 -m PEM -f /your/ssh/path/private.key
ssh-keygen -e -m PEM -f /your/ssh/path/private.key > /your/ssh/path/public.key.pub
```

Note: the local folder '.ssh' is ignored by git in the current configuration of the project. If you decide to put your key pair in the local .ssh folder, make sure that '.ssh' remains ignored and is not removed from the .gitignore file.

#### .env file

Create a `.env` file in the root folder and copy the content of the `.env.example` provided.
Modify the values of the different configuration fields according to your installation.

Example:

```bash
PRIVATE_KEY_PATH=/path/to/ssh/private.key
PUBLIC_KEY_PATH=/path/to/ssh/public.key
BCRYPT_PASSWORD=some-secret-password
SALT_ROUNDS=10
PORT=3000
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=shopping
POSTGRES_DB_TEST=shopping_test
POSTGRES_USER=shopping_user
POSTGRES_PASSWORD=password123
POSTGRES_PASSWORD_TEST=password123
```

### Installing packages

Run in the terminal `npm i` to install the required packages for this application to be run locally

### Databases

This application uses POSTGRES databases. You either need to have PostgreSQL installed or Docker installed on your machine.

#### Postgres database with Docker

To use the docker database, run `docker-compose up` in the terminal in the root folder of this application

#### Postgres database with PostgreSQL

Follow the official installation instruction from the PostgreSQL website

#### Instructions

* The application uses 2 **postgres** databases:
  * one used for running the local server `POSTGRES_DB`
  * another one used for running the unit tests `POSTGRES_DB_TEST`
* Make sure that these schemas exist in your environment.
* Make sure that specified `POSTGRES_USER` exists, or create it otherwise.

#### Migration

The `package.json` files contains a series of usefull scripts to easily migrate the databases up, down, or reset for the development database as well as for the test database.

* Migration UP
  * `npm run migrate:dev:up`
  * `npm run migrate:test:up`

* Migration DOWN (1 migration script down)
  * `npm run migrate:dev:down`
  * `npm run migrate:test:down`

* Migration RESET, to reset to zero a database
  * `npm run migrate:dev:reset`
  * `npm run migrate:test:reset`

## Start

### Local server

To start the application locally on your machine execute in a terminal `npm start`.

Note that the database will be migrated up with the missing migration scripts before starting the local server via the automatic script hook `prestart`.

## Tests

Execute in the terminal `npm test` to execute the unit tests of the application.

Note that the database used for the unit tests will be automatically migrated up before the execution of the tests, and be reset down after the execution of all the unit tests, via the scripts hooks `pretest` and `posttest`.

Note: in the current version of this application, the unit tests are executed on a built version of the application, and not in real time.

## Build

To build the application execute in the terminal `npm run build`. The distribution built will be found in the local `dist` folder.

## API

### Root URL

All the API endpoints must be prefixed with `/api/v1`. In order to facilitate the reading of this documentation in the next sections, the prefix is intentionally not mentionned, as well as the address of the server, but are admitted to exists in real usage of this API.

For instance, for a server running on localhost on port 3000, the instruction `GET /products` must be understood `GET http://localhost:3000/api/v1/products`.

### Registering new user

* To register a new user use the following endpoint:
  * `POST /users`
  * Body content:

```json
{
  "email": "",
  "firstName": "",
  "lastName": "",
  "password": ""
}
```

### Authentication

Most of the API use an authentication with a JWT token in the request header. For such requests, the token must be place in the `Authorization` header with a value `Bearer jwt.token.value` ("Bearer", space character, "the JWT token itself").

The token is passed in the response body of the authentication endpoint:

* `POST /authenticate`
  * Body content:

```json
{
  "email": "",
  "password": ""
}
```

* Response content:

```json
{
  "token": "...",
  "user": {}
}
```

### Admin users

Admin users have to be set directly in the database by setting the column `is_admin` to `1` in the `users` table for the desired user.

### Models

* User

```typescript
{
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin?: boolean;
}
```

* Product

```typescript
{
  id: number;
  name: string;
  price: number;
  category?: string;
}
```

* Order

```typescript
{
  id: number;
  userId: number;
  status: OrderStatus;
  items?: OrderItem[];
}
```

* OrderItem

```typescript
{
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
}
```

### Complete list

* `admin` GET /users
* POST /users (registration)
  * Manual modification in the DB for is_admin users
* `admin`, `authed` GET /users/:id
* `authed` PUT /users/:id
* `admin` DELETE /users/:id
* POST /authenticate (login)
* GET /products
* `admin` POST /products
* GET /products/:id
* `admin` PUT /products/:id
* `admin` DELETE /products/:id
* `admin` GET /orders
* `authed` GET /users/:userId/orders
* `authed` POST /users/:userId/orders
* `authed` GET /users/:userId/orders/:orderId
* `authed` PUT /users/:userId/orders/:orderId
* `authed` POST /users/:userId/orders/:orderId/products
* `authed` PUT /users/:userId/orders/:orderId/products/:productId
* `authed` DELETE /users/:userId/orders/:orderId/products/:productId

## Authors

* **Alain D'EURVEILHER** - *Initial work* - [AlainD.](https://github.com/AlainD-)
