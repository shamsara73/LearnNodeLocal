const express = require('express');
const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;
const expressListEndpoints = require('express-list-endpoints');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(express.json());

const database = 'RMS';
const username = 'userMP';
const password = 'Bii123456';
const host = '10.235.84.47';
const dbport = 1661;

const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: dbport,
  dialect: 'mssql',
  define: {
    freezeTableName: true,
  },
});
// Map SQL Server data types to Sequelize data types
const sqlServerToSequelize = {
    int: DataTypes.INTEGER,
    bit: DataTypes.BOOLEAN,
    bigint: DataTypes.BIGINT,
    varchar: DataTypes.STRING,
    nvarchar: DataTypes.STRING,
    float: DataTypes.FLOAT,
    datetime: DataTypes.DATE,
    // Add more data type mappings as needed
  };
  // Function to establish associations based on foreign keys
async function createAssociations(models) {
  const res = await sequelize.query(`select  t.name as TableWithForeignKey,
        c.name as ForeignKeyColumn,
        t2.name as DependentOnTable,
        c2.name as ReferencedColumn,
        N'N:1'
from    sys.foreign_key_columns as fk
inner join sys.tables as t
on      fk.parent_object_id = t.object_id
inner join sys.columns as c
on      fk.parent_object_id = c.object_id
        and fk.parent_column_id = c.column_id
inner join sys.columns as c2
on      c2.object_id = fk.referenced_object_id
        and c2.column_id = fk.referenced_column_id
inner join sys.tables as t2
on      t2.object_id = c2.object_id
order by TableWithForeignKey`, { type: sequelize.QueryTypes.SELECT });

res.forEach((resTable) => {
  const Model = models[resTable.TableWithForeignKey];
  const relatedModel = models[resTable.DependentOnTable];
  const relatedColumnName = resTable.ForeignKeyColumn;
  Model.belongsTo(relatedModel, {
    foreignKey: relatedColumnName,
    // as: resTable.ForeignKeyColumn+"_"+resTable.DependentOnTable, // You can use a more meaningful alias if needed
    as: resTable.DependentOnTable
  });

  relatedModel.hasMany(Model,{
    foreignKey: relatedColumnName,
    as: resTable.TableWithForeignKey+'s'
  });
})

  // for (const tableName in models) {
  //   const Model = models[tableName];
  //   for (const columnName in Model.rawAttributes) {
  //     const column = Model.rawAttributes[columnName];
  //     if (column.references) {
  //       // Assuming the foreign key references another table named relatedTableName
  //       const relatedTableName = column.references.model;
  //       const relatedModel = models[relatedTableName];
  //       if (relatedModel) {
  //         Model.belongsTo(relatedModel, {
  //           foreignKey: columnName,
  //           as: relatedTableName, // You can use a more meaningful alias if needed
  //         });
  //       }
  //     }
  //   }
  // }
}
  sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'", { type: sequelize.QueryTypes.SELECT })
    .then(async (tables) => {
      const models = {};
  
      for (const table of tables) {
        const tableName = table.table_name;
        const attributes = {};
  
        // Fetch columns for the table
        const columns = await sequelize.query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`, { type: sequelize.QueryTypes.SELECT });
  
        columns.forEach((column) => {
          const columnName = column.COLUMN_NAME;
          const dataType = column.DATA_TYPE;
          
          // Map SQL Server data type to Sequelize data type
          const sequelizeType = sqlServerToSequelize[dataType.toLowerCase()];
  
          if (sequelizeType) {
            attributes[columnName] = {
              type: sequelizeType,
            };
            // Check if the column name is 'id' and mark it as the primary key
            if (columnName.toLowerCase() === 'id') {
                attributes[columnName].primaryKey = true;
                attributes[columnName].autoIncrement = true;
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
          timestamps:false,
        });
  
  
        models[tableName] = model;
      }
      // Create associations between models
      createAssociations(models);
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

    route.get('/', async (req, res) => {
        try {
        const records = await Model.findAll({ include: { all: true }});
        res.json(records);
        } catch (error) {
            console.error(error);
        res.status(500).json({ error: 'Internal Server Error All' });
        }
    });

    // Get a specific record by ID
    route.get('/:id', async (req, res) => {
        try {
        const record = await Model.findByPk(req.params.id,{ include: { all: true }});
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
            const updatedRecord = await Model.findByPk(req.params.id,{ include: { all: true }});
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

    const routes = expressListEndpoints(app);
    // console.log("Registered routes:");
    // console.log(routes);

    const swaggerSpec = require('./swagger');

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec(routes,models)));
    

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Error:', err);
  });
