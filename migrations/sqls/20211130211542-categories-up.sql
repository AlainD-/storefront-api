CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

ALTER TABLE categories
ADD CONSTRAINT unique_name UNIQUE (name);

INSERT INTO categories (name) SELECT DISTINCT(category) FROM products;

ALTER TABLE products
ADD COLUMN category_id integer;

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE p.category = c.name;

ALTER TABLE products
ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE products
ADD CONSTRAINT fk_categories
  FOREIGN KEY (category_id)
  REFERENCES categories (id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE products
DROP COLUMN IF EXISTS category;
