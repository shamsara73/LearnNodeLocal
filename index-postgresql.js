const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

const database = 'RMS';
const username = 'userMP';
const password = 'Bii123456';
const host = 'localhost'; // Update with your PostgreSQL host
const port = 5432; // Update with your PostgreSQL port

const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: port,
  dialect: 'postgres', // Set the dialect to 'postgres' for PostgreSQL
  define: {
    freezeTableName: true,
  },
});

// Map PostgreSQL data types to Sequelize data types
const pgToSequelize = {
  integer: DataTypes.INTEGER,
  bigint: DataTypes.BIGINT,
  character varying: DataTypes.STRING,
  text: DataTypes.TEXT,
  real: DataTypes.FLOAT,
  timestamp with time zone: DataTypes.DATE,
  // Add more data type mappings as needed
};

sequelize
  .query("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'", {
    type: sequelize.QueryTypes.SELECT,
  })
  .then(async (tables) => {
    const models = {};

    for (const table of tables) {
      const tableName = table.table_name;
      const attributes = {};

      // Fetch columns for the table
      const columns = await sequelize.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`,
        { type: sequelize.QueryTypes.SELECT }
      );

      columns.forEach((column) => {
        const columnName = column.column_name;
        const dataType = column.data_type;

        // Map PostgreSQL data type to Sequelize data type
        const sequelizeType = pgToSequelize[dataType.toLowerCase()];

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
        if (tables.find((t) => t.table_name === relatedTableName)) {
          model.belongsTo(models[relatedTableName]);
          models[relatedTableName].hasMany(model);
        }
      }

      models[tableName] = model;
    }

    // Synchronize the models with the database
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