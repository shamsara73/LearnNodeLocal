# Express JS Automatic REST API

Express JS Automatic REST API is an Express JS API that automatically generates routes and swagger based on every table and view on database.

## Supported Database

(V) Microsoft SQL Server  
(V) MySQL  
(-) PostgreSQL  
(-) Oracle  

For now only Microsoft SQL Server supported and tested.
But theoretically it can support all other RDBMS by adjusting the query. 

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install dependencies.

```bash
npm install
```

## Usage
Change the database config according to your database
```python
const database = 'Your Database';
const username = 'Your Username';
const password = 'Your Password';
const host = 'Your Database Address (IP/Host Address)';
const dbport = 1133;
```

Start the server
```node
node index.js
```

Access the API Swagger Endpoint 

```
http://localhost:3000/api-docs/
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

## License

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
