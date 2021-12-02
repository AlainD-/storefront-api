ALTER TABLE products
ADD COLUMN category VARCHAR(100);

UPDATE products p
SET category = c.name
FROM categories c
WHERE p.category_id = c.id;

ALTER TABLE products
DROP COLUMN IF EXISTS category_id;

DROP TABLE IF EXISTS categories;
