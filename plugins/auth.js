const fp = require('fastify-plugin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/database');

async function authPlugin(fastify, options) {
  // Register JWT plugin
  fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  });

  // Authentication decorators
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // Role-based authorization
  fastify.decorate('authorize', function(roles = []) {
    return async function(request, reply) {
      try {
        await request.jwtVerify();
        
        if (roles.length > 0 && !roles.includes(request.user.role)) {
          return reply.code(403).send({
            success: false,
            message: 'Insufficient permissions'
          });
        }
      } catch (err) {
        reply.send(err);
      }
    };
  });

  // Hash password utility
  fastify.decorate('hashPassword', async function(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  });

  // Compare password utility
  fastify.decorate('comparePassword', async function(password, hash) {
    return await bcrypt.compare(password, hash);
  });

  // Generate JWT token
  fastify.decorate('generateToken', function(user) {
    return fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    });
  });

  // User registration
  fastify.decorate('registerUser', async function(userData) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();

      console.error('Checking for existing user:', existingUser);
      if (existingUser) {
        console.error('User already exists:', existingUser);
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await fastify.hashPassword(userData.password);

      console.log('Hashed password:', hashedPassword);
      // Create user
      const { data: user, error } = await supabase
        .from('users')
        .insert([{
          id: uuidv4(),
          email: userData.email,
          password: hashedPassword,
          full_name: userData.fullName,
          role: userData.role,
          grade: userData.grade || null,
          subject: userData.subject || null
        }])
        .select()
        .single();

     console.log('User created:', user);
      if (error) {
        throw error;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
        console.error('Registration error in auth:', error, error && error.stack, JSON.stringify(error));

      throw error;
    }
  });

  // User login
  fastify.decorate('loginUser', async function(email, password) {
    try {
      // Find user
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await fastify.comparePassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = fastify.generateToken(user);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      throw error;
    }
  });

  // Get current user
  fastify.decorate('getCurrentUser', async function(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, grade, subject, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw error;
    }
  });
}

module.exports = fp(authPlugin, {
  name: 'auth'
}); 