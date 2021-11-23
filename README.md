# StoreFront API

## Postgres database with Docker

To use the docker database, run `docker-compose up`

## Todos

* Add UNIQUE in products_in_orders with (order_id, product_id)

## API

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
