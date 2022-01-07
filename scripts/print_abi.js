
const fs = require("fs");

const path = __dirname + '/../artifacts/contracts/Alphasea.sol/Alphasea.json';
const text = fs.readFileSync(path);

console.log(JSON.stringify(JSON.parse(text)['abi']));
