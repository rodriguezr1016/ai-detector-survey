import { MongoClient } from "mongodb";

declare global {
  var __mongodbClientPromise__: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

function getRequiredEnv(name: "MONGODB_URI" | "MONGODB_DB") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

export async function getDatabase() {
  const uri = getRequiredEnv("MONGODB_URI");
  const dbName = getRequiredEnv("MONGODB_DB");

  if (!clientPromise) {
    if (process.env.NODE_ENV === "development") {
      if (!global.__mongodbClientPromise__) {
        global.__mongodbClientPromise__ = new MongoClient(uri).connect();
      }

      clientPromise = global.__mongodbClientPromise__;
    } else {
      clientPromise = new MongoClient(uri).connect();
    }
  }

  const client = await clientPromise;
  return client.db(dbName);
}
