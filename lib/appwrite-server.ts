/**
 * Appwrite Server-side Configuration
 * Cliente admin para operações server-side com API key
 * USA O SDK NODE-APPWRITE
 */

import { Client, Databases, Users, ID } from 'node-appwrite';

// Cliente admin (server-side only)
const adminClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_KEY!);

// Serviços admin
const adminDatabases = new Databases(adminClient);
const adminUsers = new Users(adminClient);

export { adminClient, adminDatabases, adminUsers, ID };