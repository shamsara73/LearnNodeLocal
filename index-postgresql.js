const express = require('express');
const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;
const expressListEndpoints = require('express-list-endpoints');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(express.json());

const database = 'elcxkrlh';
// const username = 'elcxkrlh';
// const password = 'GvaaJjftJQ82xgmRea97GoLuojUKEXDq';
// const host = 'postgres://elcxkrlh:GvaaJjftJQ82xgmRea97GoLuojUKEXDq@john.db.elephantsql.com/elcxkrlh';
// const dbport = 3306;

// const sequelize = new Sequelize(database, username, password, {
//   host: host,
//   // port: dbport,
//   dialect: 'postgres',
//   define: {
//     freezeTableName: true,
//   },
// });

// Define your ElephantSQL connection URL
const databaseUrl = 'postgres://elcxkrlh:GvaaJjftJQ82xgmRea97GoLuojUKEXDq@john.db.elephantsql.com/elcxkrlh';

// Create a Sequelize instance
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Use this option if you encounter SSL connection issues (not recommended for production)
    },
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
  const res = await sequelize.query(`WITH foreign_keys AS (
    SELECT
        tc.table_name AS TableWithForeignKey,
        kcu.column_name AS ForeignKeyColumn,
        ccu.table_name AS DependentOnTable,
        ccu.column_name AS referenced_column
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON tc.constraint_name = ccu.constraint_name
    WHERE
        tc.constraint_type = 'FOREIGN KEY'
)
SELECT
    t1.table_name,
    f1.foreign_key_column,
    f1.referenced_table,
    f1.referenced_column
FROM
    foreign_keys AS f1
    JOIN information_schema.tables AS t1
        ON f1.table_name = t1.table_name
WHERE
    t1.table_schema = 'public';

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
        const columns = await sequelize.query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}';`, { type: sequelize.QueryTypes.SELECT })
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
