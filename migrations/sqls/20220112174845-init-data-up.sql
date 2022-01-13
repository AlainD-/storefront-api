/* Some basic categories */
INSERT INTO categories (name) VALUES ('Books');
INSERT INTO categories (name) VALUES ('Electronics');
INSERT INTO categories (name) VALUES ('Clothes');
INSERT INTO categories (name) VALUES ('Shoes');
INSERT INTO categories (name) VALUES ('Accessories');

/* Some basic products */
INSERT INTO products (name, price, category_id, image_url)
SELECT 'Book 1', 12, id, 'https://torange.biz/photo/34/HD/books-book-library-34961.jpg' FROM categories WHERE name = 'Books';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'Book 2', 4, id, 'https://libreshot.com/wp-content/uploads/2016/07/books.jpg' FROM categories WHERE name = 'Books';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'Book 3', 23, id, NULL FROM categories WHERE name = 'Books';

INSERT INTO products (name, price, category_id, image_url)
SELECT 'Headphones', 125, id, 'https://libreshot.com/wp-content/uploads/2015/10/headphones.jpg' FROM categories WHERE name = 'Electronics';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'Charger', 36, id, 'http://amplecable.com/images/custom/microusb-sm.jpg' FROM categories WHERE name = 'Electronics';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'USB Key', 9, id, NULL FROM categories WHERE name = 'Electronics';

INSERT INTO products (name, price, category_id, image_url)
SELECT 'Skirt', 118, id, 'https://www.lookandlearn.com/history-images/preview/YM/YM0/YM0068/YM0068531_Skirt.jpg' FROM categories WHERE name = 'Clothes';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'T-Shirt', 42, id, NULL FROM categories WHERE name = 'Clothes';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'Jeans', 75, id, 'https://www.bootbarn.com/on/demandware.static/-/Sites-master-product-catalog-shp/default/dw6bdd800b/images/725/2000284725_401_P1.JPG' FROM categories WHERE name = 'Clothes';

INSERT INTO products (name, price, category_id, image_url)
SELECT 'Sandals', 17, id, 'https://www.clipartmax.com/png/middle/422-4227635_transparent-free-png-transparent-background-women-gladiators-sandals.png' FROM categories WHERE name = 'Shoes';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'Boots', 164, id, 'https://thumbs.dreamstime.com/b/cowboy-boots-12390315.jpg' FROM categories WHERE name = 'Shoes';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'Flip Flops', 7, id, NULL FROM categories WHERE name = 'Shoes';

INSERT INTO products (name, price, category_id, image_url)
SELECT 'Purse', 528, id, 'https://cdn.pixabay.com/photo/2015/08/10/20/15/handbag-883114_1280.jpg' FROM categories WHERE name = 'Accessories';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'Power Bank', 38, id, 'https://media.krefel.be/sys-master/products/8838103334942/570x450.62001377_5.jpg' FROM categories WHERE name = 'Accessories';
INSERT INTO products (name, price, category_id, image_url)
SELECT 'Belt', 15, id, 'https://static4.depositphotos.com/1000865/425/i/600/depositphotos_4256838-stock-photo-black-leather-belt.jpg' FROM categories WHERE name = 'Accessories';
