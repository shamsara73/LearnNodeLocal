const express = require('express');
const Sequelize = require('sequelize');
const mysql2 = require('mysql2'); // Require the mysql2 package
const DataTypes = Sequelize.DataTypes;

const app = express();
app.use(express.json());

const database = 'RMS';
const username = 'userMP';
const password = 'Bii123456';
const host = 'localhost'; // Change to your MySQL server host
const dbport = 3306; // Change to your MySQL server port
const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: dbport,
  dialect: 'mysql', // Set the dialect to MySQL
  define: {
    freezeTableName: true,
  },
});

// Map MySQL data types to Sequelize data types
const mysqlToSequelize = {
  int: DataTypes.INTEGER,
  bigint: DataTypes.BIGINT,
  varchar: DataTypes.STRING,
  text: DataTypes.TEXT,
  float: DataTypes.FLOAT,
  datetime: DataTypes.DATE,
  // Add more data type mappings as needed
};

sequelize.query('SHOW TABLES', { type: sequelize.QueryTypes.SELECT })
  .then(async (tables) => {
    const models = {};

    for (const table of tables) {
      const tableName = table[`Tables_in_${database}`];
      const attributes = {};

      // Fetch columns for the table
      const columns = await sequelize.query(`DESCRIBE ${tableName}`, { type: sequelize.QueryTypes.SELECT });

      columns.forEach((column) => {
        const columnName = column.Field;
        const dataType = column.Type;

        // Map MySQL data type to Sequelize data type
        const sequelizeType = mysqlToSequelize[dataType.split('(')[0].toLowerCase()];

        if (sequelizeType) {
          attributes[columnName] = {
            type: sequelizeType,
          };
          // Check if the column name is 'id' and mark it as the primary key
          if (columnName.toLowerCase() === 'id') {
            attributes[columnName].primaryKey = true;
          }
        } else {
          // Handle unsupported data types or add more mappings as needed
          console.warn(`Unsupported data type for column '${columnName}' in table '${tableName}': ${dataType}`);
        }
      });

      // Define the model with attributes
      const model = sequelize.define(tableName, attributes, {
        tableName: tableName,
        freezeTableName: true,
        timestamps: false,
      });

      // Automatically try to set up associations based on naming conventions
      if (tableName.endsWith('s')) {
        const relatedTableName = tableName.slice(0, -1);
        if (tables.find((t) => t[`Tables_in_${database}`] === relatedTableName)) {
          model.belongsTo(models[relatedTableName]);
          models[relatedTableName].hasMany(model);
        }
      }

      models[tableName] = model;
    }

    sequelize.sync();

    // Define routes for CRUD operations
    for (const tableName in models) {
      const Model = models[tableName];
      const route = express.Router();

      // Create a new record
      route.post('/', async (req, res) => {
        try {
          const newRecord = await Model.create(req.body);
          res.status(201).json(newRecord);
        } catch (error) {
          console.error(error);
          res.status(400).json({ error: 'Bad Request' });
        }
      });

      // Get all records
      route.get('/', async (req, res) => {
        try {
          const records = await Model.findAll();
          res.json(records);
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal Server Error All' });
        }
      });

      // Get a specific record by ID
      route.get('/:id', async (req, res) => {
        try {
          const record = await Model.findByPk(req.params.id);
          if (record) {
            res.json(record);
          } else {
            res.status(404).json({ error: 'Record not found' });
          }
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal Server Error By ID' });
        }
      });

      // Update a specific record by ID
      route.put('/:id', async (req, res) => {
        try {
          const [updatedCount] = await Model.update(req.body, {
            where: { id: req.params.id },
          });

          if (updatedCount > 0) {
            const updatedRecord = await Model.findByPk(req.params.id);
            res.json(updatedRecord);
          } else {
            res.status(404).json({ error: 'Record not found' });
          }
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

      // Delete a specific record by ID
      route.delete('/:id', async (req, res) => {
        try {
          const deletedCount = await Model.destroy({
            where: { id: req.params.id },
          });

          if (deletedCount > 0) {
            res.status(204).send();
          } else {
            res.status(404).json({ error: 'Record not found' });
          }
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

      app.use(`/${tableName}`, route);
    }

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Error:', err);
  });
