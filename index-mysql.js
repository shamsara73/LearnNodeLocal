const express = require('express');
const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;
const expressListEndpoints = require('express-list-endpoints');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(express.json());

const database = 'ecommerce';
const username = 'root';
const password = '';
const host = 'localhost';
const dbport = 3306;

const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: dbport,
  dialect: 'mysql',
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
    decimal: DataTypes.FLOAT,
    datetime: DataTypes.DATE,
    char:DataTypes.CHAR,
    text:DataTypes.TEXT,
    // Add more data type mappings as needed
  };
  // Function to establish associations based on foreign keys
async function createAssociations(models) {
  const res = await sequelize.query(`SELECT 
  TABLE_NAME AS TableWithForeignKey,
  COLUMN_NAME AS ForeignKeyColumn,
  REFERENCED_TABLE_NAME AS DependentOnTable,
  REFERENCED_COLUMN_NAME AS ReferencedColumn,
  'N:1' AS RelationshipType
FROM
  INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
  REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TableWithForeignKey;
`, { type: sequelize.QueryTypes.SELECT });

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
    as: resTable.TableWithForeignKey
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
  sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema = '"+database+"';", { type: sequelize.QueryTypes.SELECT })
    .then(async (tables) => {
      const models = {};
  
      for (const table of tables) {
        const tableName = table.TABLE_NAME;
        const attributes = {};
  
        // Fetch columns for the table
        const columns = await sequelize.query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}' and TABLE_SCHEMA = '${database}';`, { type: sequelize.QueryTypes.SELECT })
          // .then((columns) => {
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
        // }
  
        
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
