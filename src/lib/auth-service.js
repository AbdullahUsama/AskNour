import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getMongoClient } from './mongodb';
import { USERS_COLLECTION } from './constants';

// JWT Configuration
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "your-secret-key-change-in-production-2024";
const JWT_ALGORITHM = "HS256";
const TOKEN_EXPIRY_HOURS = 24;

// Collections
const USERS_AUTH_COLLECTION = "authenticated_users";
const USER_SESSIONS_COLLECTION = "user_sessions";

class AuthService {
  constructor() {
    this.db = null;
    this.usersCollection = null;
    this.sessionsCollection = null;
    this.kycCollection = null;
  }

  async initialize() {
    if (!this.db) {
      this.db = await getMongoClient();
      this.usersCollection = this.db.collection(USERS_AUTH_COLLECTION);
      this.sessionsCollection = this.db.collection(USER_SESSIONS_COLLECTION);
      this.kycCollection = this.db.collection(USERS_COLLECTION);
    }
  }

  hashPassword(password) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  verifyPassword(password, hashedPassword) {
    try {
      return bcrypt.compareSync(password, hashedPassword);
    } catch (error) {
      console.error(`DEBUG: Error verifying password: ${error}`);
      return false;
    }
  }

  async registerUser(kycData) {
    try {
      await this.initialize();

      // Check if user already exists
      const existingUser = await this.usersCollection.findOne({
        $or: [
          { email: kycData.email },
          { username: kycData.email }
        ]
      });

      if (existingUser) {
        console.log("DEBUG: User already exists");
        return null;
      }

      // Hash the password
      const hashedPassword = this.hashPassword(kycData.password);

      // Create user document
      const userDoc = {
        username: kycData.email,
        email: kycData.email,
        password_hash: hashedPassword,
        name: kycData.name,
        mobile: kycData.mobile,
        faculty: kycData.faculty,
        role: "user",
        is_active: true,
        created_at: new Date(),
        last_login: null,
        session_id: kycData.sessionId || "unknown"
      };

      const result = await this.usersCollection.insertOne(userDoc);
      const userId = result.insertedId.toString();

      console.log(`DEBUG: Successfully registered user with ID: ${userId}`);
      return userId;

    } catch (error) {
      console.error(`DEBUG: Error registering user: ${error}`);
      return null;
    }
  }

  async authenticateUser(username, password) {
    try {
      await this.initialize();

      // Find user by username or email
      const user = await this.usersCollection.findOne({
        $or: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() }
        ],
        is_active: true
      });

      if (!user) {
        console.log(`DEBUG: User not found: ${username}`);
        return [null, null];
      }

      // Verify password
      if (!this.verifyPassword(password, user.password_hash)) {
        console.log(`DEBUG: Invalid password for user: ${username}`);
        return [null, null];
      }

      // Update last login
      await this.usersCollection.updateOne(
        { _id: user._id },
        { $set: { last_login: new Date() } }
      );

      // Generate JWT token
      const token = this.generateJwtToken(user);

      // Remove sensitive data from user object
      const userData = {
        user_id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        mobile: user.mobile,
        faculty: user.faculty,
        role: user.role || "user",
        last_login: user.last_login
      };

      console.log(`DEBUG: Successfully authenticated user: ${username}`);
      return [token, userData];

    } catch (error) {
      console.error(`DEBUG: Error authenticating user: ${error}`);
      return [null, null];
    }
  }

  generateJwtToken(user) {
    try {
      // Create payload
      const payload = {
        user_id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || "user",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (TOKEN_EXPIRY_HOURS * 3600)
      };

      return jwt.sign(payload, JWT_SECRET_KEY, { 
        algorithm: JWT_ALGORITHM,
        expiresIn: `${TOKEN_EXPIRY_HOURS}h`
      });

    } catch (error) {
      console.error(`DEBUG: Error generating JWT token: ${error}`);
      return null;
    }
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY, { 
        algorithms: [JWT_ALGORITHM] 
      });

      await this.initialize();

      // Check if user still exists and is active
      const user = await this.usersCollection.findOne({
        _id: decoded.user_id,
        is_active: true
      });

      if (!user) {
        console.log(`DEBUG: User not found or inactive for token: ${decoded.user_id}`);
        return null;
      }

      // Check if session is still valid (optional - check sessions collection)
      const session = await this.sessionsCollection.findOne({
        user_id: decoded.user_id,
        token: token,
        expires_at: { $gt: new Date() }
      });

      return {
        user_id: decoded.user_id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        session_valid: !!session
      };

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log("DEBUG: Token expired");
      } else if (error.name === 'JsonWebTokenError') {
        console.log(`DEBUG: Invalid token: ${error.message}`);
      } else {
        console.error(`DEBUG: Error verifying token: ${error}`);
      }
      return null;
    }
  }

  async logoutUser(token) {
    try {
      await this.initialize();

      const decoded = jwt.verify(token, JWT_SECRET_KEY);
      
      // Deactivate session
      await this.sessionsCollection.updateOne(
        { user_id: decoded.user_id, token: token },
        { $set: { is_active: false, logged_out_at: new Date() } }
      );

      return true;

    } catch (error) {
      console.error(`DEBUG: Error logging out user: ${error}`);
      return false;
    }
  }

  async getUserById(userId) {
    try {
      await this.initialize();

      const user = await this.usersCollection.findOne({
        _id: userId,
        is_active: true
      });

      if (user) {
        // Remove sensitive data
        const { password_hash, ...userData } = user;
        return userData;
      }
      return null;

    } catch (error) {
      console.error(`DEBUG: Error getting user by ID: ${error}`);
      return null;
    }
  }

  async cleanupExpiredSessions() {
    try {
      await this.initialize();

      await this.sessionsCollection.deleteMany({
        expires_at: { $lt: new Date() }
      });

      console.log("DEBUG: Expired sessions cleaned up");

    } catch (error) {
      console.error(`DEBUG: Error cleaning up expired sessions: ${error}`);
    }
  }
}

// Global auth service instance
const authService = new AuthService();

export { authService };