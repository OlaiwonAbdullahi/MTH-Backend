const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "MTH Quiz API",
    description: "API documentation for the MTH Quiz application",
    version: "1.0.0",
  },
  host: "mth-backend-six.vercel.app",
  schemes: ["https"],
  basePath: "/",
};

const outputFile = "./swagger-output.json";
const endpointsFiles = [
  "./index.js",
  "./routes/authRoutes.js",
  "./routes/adminRoutes.js",
  "./routes/quizRoutes.js",
];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("✅ Swagger JSON generated successfully at", outputFile);
});
