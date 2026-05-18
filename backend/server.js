require("dotenv").config();
const app = require("./app.js");
const port = process.env.PORT || 3000;
const { testDbConnection } = require("./config/db.js");
testDbConnection()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server started successfully on port ${port}`);
    });
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
