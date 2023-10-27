

-- Create a table for products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock_quantity INT NOT NULL
);

-- Create a table for product categories
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- Create a table for product-to-category relationships
CREATE TABLE product_category_relationship (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    category_id INT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (category_id) REFERENCES product_categories(id)
);

-- Create a table for customers with a larger password_hash column
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(128) NOT NULL, -- Use VARCHAR(128) for SHA-256
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL
);

-- Create a table for addresses
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Create a table for orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date TIMESTAMP NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Create a table for order items
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create a table for payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Insert some sample data into product categories
INSERT INTO product_categories (name) VALUES
    ('Electronics'),
    ('Clothing'),
    ('Home & Garden'),
    ('Books');

-- Insert some sample data into products
INSERT INTO products (name, description, price, stock_quantity) VALUES
    ('Product 1', 'Description for Product 1', 19.99, 100),
    ('Product 2', 'Description for Product 2', 29.99, 75),
    ('Product 3', 'Description for Product 3', 9.99, 150),
    ('Product 4', 'Description for Product 4', 49.99, 50);

-- Insert some sample data into product-to-category relationships
INSERT INTO product_category_relationship (product_id, category_id) VALUES
    (1, 1),
    (2, 1),
    (3, 2),
    (4, 3);

-- Insert some sample data into customers
-- Insert some sample data into customers with SHA-256 hashed passwords
INSERT INTO customers (username, password_hash, first_name, last_name, email) VALUES
    ('john_doe', digest('password123', 'sha256'), 'John', 'Doe', 'john@example.com'),
    ('jane_smith', digest('securePass', 'sha256'), 'Jane', 'Smith', 'jane@example.com'),
    ('bob_johnson', digest('p@ssw0rd', 'sha256'), 'Bob', 'Johnson', 'bob@example.com');


-- Insert some sample data into addresses
INSERT INTO addresses (customer_id, address_line1, city, postal_code, country) VALUES
    (1, '123 Main St', 'New York', '10001', 'USA'),
    (2, '456 Elm St', 'Los Angeles', '90001', 'USA'),
    (3, '789 Oak St', 'Chicago', '60601', 'USA');

-- Insert some sample data into orders
INSERT INTO orders (customer_id, order_date) VALUES
    (1, '2023-10-25 10:00:00'),
    (2, '2023-10-26 11:30:00'),
    (3, '2023-10-27 15:45:00');

-- Insert some sample data into order items
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
    (1, 1, 2, 19.99),
    (2, 2, 1, 29.99),
    (3, 3, 5, 9.99),
    (1, 4, 1, 49.99);

-- Insert some sample data into payments
INSERT INTO payments (order_id, payment_date, amount) VALUES
    (1, '2023-10-25 10:30:00', 59.98),
    (2, '2023-10-26 12:00:00', 29.99),
    (3, '2023-10-27 16:00:00', 49.95);
