ALTER TABLE products_in_orders
ADD CONSTRAINT unique_product_order UNIQUE (order_id, product_id);
