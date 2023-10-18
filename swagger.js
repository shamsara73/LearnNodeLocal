const swaggerJsdoc = require('swagger-jsdoc');

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
  
            swaggerDefinition.paths[_path][method.toLowerCase()] = {
              summary,
              tags :[tags],
              produces: ["application/json"],
              parameters :_path.includes("/{id}") && parameters,
              responses: {
                200: {
                  description: 'Successful response',
                },
              },
            };
          }
          
        })
        
      });
      
      // Generate object definitions
    //   let definitions = {};
    //   for (const tableName in models) {
    //     const Model = models[tableName];
    //     definitions[tableName] = {
    //         properties:{
                
    //         }
    //     }
    //   }

    //   swaggerDefinition.definitions = definitions;
      

      // Generate Swagger specs using swagger-jsdoc
      const options = {
        swaggerDefinition,
        apis: ['./index.js'],
      };
      
      const swaggerSpec = swaggerJsdoc(options);
    //   console.log(JSON.stringify(swaggerSpec, null, 2));

    return swaggerSpec;
} 

module.exports = generateSpecs;
