const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "MTH Quiz API",
    description: "API documentation for the MTH Quiz application",
  },
  host: "https://mth-backend-vh63.onrender.com/",
  schemes: ["https"],
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./index.js"];
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("Swagger JSON generated at", outputFile);
});
