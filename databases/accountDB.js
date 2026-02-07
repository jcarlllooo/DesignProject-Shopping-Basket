// accountDB.js
import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';

/**
 * Initialize database and create 'users' table
 */
export const initDB = async () => {
  try {
    const db = await SQLite.openDatabaseAsync('account.db');
    console.log("initDB: Database opened successfully.");

    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        dateOfBirth TEXT,
        password TEXT NOT NULL
      );
    `);
    console.log("initDB: 'users' table created/verified.");
    return db;
  } catch (error) {
    console.error("initDB: Error initializing database:", error);
    Alert.alert("Database Error", "Failed to initialize the database.");
    throw error;
  }
};

/**
 * Insert new user
 */
export const insertUser = async (db, fullName, email, dateOfBirth, password) => {
  if (!db || typeof db.runAsync !== 'function') {
    Alert.alert("Error", "Database connection is not valid. Please ensure initDB has completed.");
    throw new Error("Database connection is not valid or missing runAsync method.");
  }

  try {
    const result = await db.runAsync(
      `INSERT INTO users (fullName, email, dateOfBirth, password) VALUES (?, ?, ?, ?);`,
      [fullName, email, dateOfBirth, password]
    );
    console.log("insertUser: User inserted:", result);
    return result;
  } catch (error) {
    console.error("insertUser: Insert error:", error);
    if (error.message.includes("UNIQUE constraint failed: users.email")) {
      Alert.alert("Error", "This email address is already registered.");
    } else {
      Alert.alert("Error", "Failed to insert user. Please try again.");
    }
    throw error;
  }
};

/**
 * Check credentials for login
 */
export const checkUserCredentials = async (db, email, password) => {
  if (!db || typeof db.getFirstAsync !== 'function') {
    Alert.alert("Error", "Database connection is not valid. Please ensure initDB has completed.");
    throw new Error("Database connection is not valid or missing getFirstAsync method.");
  }

  try {
    const user = await db.getFirstAsync(
      `SELECT * FROM users WHERE email = ? AND password = ?;`,
      [email, password]
    );
    console.log("checkUserCredentials: User found:", user);
    return user;
  } catch (error) {
    console.error("checkUserCredentials: Error checking user credentials:", error);
    Alert.alert("Database Error", "Failed to check credentials. Please try again.");
    throw error;
  }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (db, email) => {
  if (!db || typeof db.getFirstAsync !== 'function') {
    Alert.alert("Error", "Database connection is not valid.");
    throw new Error("Database connection is not valid or missing getFirstAsync method.");
  }
  try {
    const user = await db.getFirstAsync(
      `SELECT * FROM users WHERE email = ?;`,
      [email]
    );
    return user;
  } catch (error) {
    console.error("getUserByEmail: Error fetching user by email:", error);
    Alert.alert("Database Error", "Failed to retrieve user data.");
    throw error;
  }
};

/**
 * Reset user password
 */
export const resetPassword = async (db, email, newPassword) => {
  if (!db || typeof db.runAsync !== 'function') {
    Alert.alert("Error", "Database connection is not valid.");
    throw new Error("Database connection is not valid or missing runAsync method.");
  }

  try {
    await db.runAsync(
      `UPDATE users SET password = ? WHERE email = ?;`,
      [newPassword, email]
    );
    console.log(`resetPassword: Password updated for ${email}`);
    Alert.alert("Success", "Password has been reset successfully.");
  } catch (error) {
    console.error("resetPassword: Error updating password:", error);
    Alert.alert("Database Error", "Failed to reset password. Please try again.");
    throw error;
  }
};
