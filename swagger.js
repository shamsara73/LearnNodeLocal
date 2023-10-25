const swaggerJsdoc = require('swagger-jsdoc');
const Sequelize = require('sequelize');

// Generate example properties from a Sequelize model
function generateExampleFromModel(model, excludeId = false) {
  const example = {};
  for (const attribute in model.getAttributes()) {
    if (excludeId && attribute.toLowerCase() === 'id') {
      continue; // Exclude the 'id' property if specified
    }
    // Map Sequelize data types to example values (customize as needed)
    switch (model.rawAttributes[attribute].type.key) {
      case 'STRING':
        example[attribute] = 'Sample ' + attribute;
        break;
      case 'TEXT':
        example[attribute] = 'Sample ' + attribute + ' description';
        break;
      case 'FLOAT':
        example[attribute] = 10.99;
        break;
      case 'INTEGER':
      case 'BIGINT':
        example[attribute] = 10;
        break;
      case 'BOOLEAN':
        example[attribute] = true;
        break;
      // Add more data type mappings as required
      default:
        example[attribute] = null;
    }
  }
  return example;
}

function generateSpecs(routes,models){
    
    const swaggerDefinition = {
        openapi: '3.0.0',
        info: {
          title: 'Dynamic Swagger API',
          version: '1.0.0',
          description: 'API documentation for the Express.js app with dynamic routes',
        },
        paths:{}
      };
  
      routes.forEach((route) => {
        const { path, methods } = route;
        let _path = path.replace("/:id","/{id}");
        let tags = _path.replace("/{id}","").replace("/", "");
  
        if (!swaggerDefinition.paths[_path]) {
          swaggerDefinition.paths[_path] = {};
        }
        methods.forEach((method) =>{
          let summary = ""
          let parameters = [];
  
          if(method === 'GET'){
            summary = _path.includes("/{id}")? 'Get By ID':'Get All';
            parameters[0] = _path.includes("/{id}") && {"name":"id","description":"data's ID","in":"path","required":true,"type":"integer"};
  
            if(_path.includes("/{id}")){
                swaggerDefinition.paths[_path][method.toLowerCase()] = {
                    summary,
                    tags :[tags],
                    produces: ["application/json"],
                    parameters : parameters,
                    responses: {
                      200: {
                        description: 'Successful response',
                      },
                      404: {
                        description: 'Record not found',
                      },
                      500: {
                        description: 'Internal Server Error',
                      },
                    },
                  };
            }else{
                swaggerDefinition.paths[_path][method.toLowerCase()] = {
                    summary,
                    tags :[tags],
                    produces: ["application/json"],
                    responses: {
                      200: {
                        description: 'Successful response',
                      },
                      500: {
                        description: 'Internal Server Error',
                      },
                    },
                  };
            }
            
          }else if(method === "POST"){
            summary = 'Create entity';
            
            swaggerDefinition.paths[_path][method.toLowerCase()] = {
              summary,
              tags :[tags],
              produces: ["application/json"],
              requestBody : {
                required:true,
                content: {
                  'application/json': {
                    example: generateExampleFromModel(models[tags],true),
                  },
                },
              },
              responses: {
                201: {
                  description: 'Created',
                  content: {
                    'application/json': {
                      example: generateExampleFromModel(models[tags]),
                      // Include any other response properties as needed
                    },
                  },
                },
                500: {
                  description: 'Internal Server Error',
                },
              },
            };
          }else if(method === "PUT"){
            summary = 'Update entity';
            parameters[0] = _path.includes("/{id}") && {"name":"id","description":"data's ID","in":"path","required":true,"type":"integer"};
            
            swaggerDefinition.paths[_path][method.toLowerCase()] = {
              summary,
              tags :[tags],
              produces: ["application/json"],
              parameters : parameters,
              requestBody : {
                required:true,
                content: {
                  'application/json': {
                    example: generateExampleFromModel(models[tags]),
                  },
                },
              },
              responses: {
                200: {
                  description: 'Updated',
                  content: {
                    'application/json': {
                      example: generateExampleFromModel(models[tags]),
                      // Include any other response properties as needed
                    },
                  },
                },
                404: {
                  description: 'Record not found',
                },
                500: {
                  description: 'Internal Server Error',
                },
              },
            };
          }else if(method === "DELETE"){
            summary = 'Delete entity';
            parameters[0] = _path.includes("/{id}") && {"name":"id","description":"data's ID","in":"path","required":true,"type":"integer"};
            
            swaggerDefinition.paths[_path][method.toLowerCase()] = {
              summary,
              tags :[tags],
              produces: ["application/json"],
              parameters : parameters,
              responses: {
                204: {
                  description: 'Deleted',
                  
                },
                404: {
                  description: 'Record not found',
                },
                500: {
                  description: 'Internal Server Error',
                },
              },
            };
          }
          
        })
        
      });
      
      // Generate object definitions
      let definitions = {};
      for (const tableName in models) {
        const Model = models[tableName];
        let attributes = Model.getAttributes();
        let _attr = {};
        for(const atr in attributes){
          let _selAtr = attributes[atr];
          // console.log(_selAtr.type.constructor.key.toLowerCase());
          _attr[atr] = {"type" : _selAtr.type.constructor.key.toLowerCase()}
        }
        definitions[tableName] = {
            properties:_attr
        }
      }
      // console.log(JSON.stringify(definitions, null, 2));

      swaggerDefinition.definitions = definitions;
      swaggerDefinition.components = {"schemas":definitions};
      

      // Generate Swagger specs using swagger-jsdoc
      const options = {
        swaggerDefinition,
        apis: ['./index.js'],
        explorer: true,
      };
      
      const swaggerSpec = swaggerJsdoc(options);
      // console.log(JSON.stringify(swaggerSpec, null, 2));

    return swaggerSpec;
} 

module.exports = generateSpecs;
