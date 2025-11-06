const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "MTH Quiz API",
    description: "API documentation for the MTH Quiz application",
  },
  host: "https://mth-backend-six.vercel.app/",
  schemes: ["https"],
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./index.js"];
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("Swagger JSON generated at", outputFile);
});
