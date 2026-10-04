import { readConfig, setUser } from "./config";

function main() {
  const username = "Seeido";
  try {
    setUser(username);
    console.log(readConfig());
  } catch (error) {
    console.error(error);
  }
}

main();
