import { supabase } from '../config/database.js';
import { hashPassword, comparePassword, generateToken, isValidEmail } from '../utils/helpers.js';

export const signup = async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format.'
      });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    const hashedPassword = await hashPassword(password);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password: hashedPassword,
        gender: gender || null
      }])
      .select('id, name, email, gender, avatar, created_at')
      .single();

    if (error) {
      throw error;
    }

    const token = generateToken(newUser.id);

    await supabase
      .from('users')
      .update({ tokens: [token] })
      .eq('id', newUser.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: newUser,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating user.',
      error: error.message
    });
  }
};

export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user.id);

    const currentTokens = user.tokens || [];
    await supabase
      .from('users')
      .update({ tokens: [...currentTokens, token] })
      .eq('id', user.id);

    const { password: _, tokens: __, ...userWithoutSensitiveData } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userWithoutSensitiveData,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during login.',
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.token;

    const { data: user } = await supabase
      .from('users')
      .select('tokens')
      .eq('id', userId)
      .single();

    const updatedTokens = (user.tokens || []).filter(t => t !== token);

    await supabase
      .from('users')
      .update({ tokens: updatedTokens })
      .eq('id', userId);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout.',
      error: error.message
    });
  }
};

export const logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user.id;

    await supabase
      .from('users')
      .update({ tokens: [] })
      .eq('id', userId);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout from all devices.',
      error: error.message
    });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, gender, avatar, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user details.',
      error: error.message
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, gender, avatar, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: { users, count: users.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users.',
      error: error.message
    });
  }
};

export const updateUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, gender } = req.body;

    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile.'
      });
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (gender) updateData.gender = gender;
    if (req.file) updateData.avatar = `/uploads/${req.file.filename}`;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, name, email, gender, avatar, updated_at')
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: updatedUser }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile.',
      error: error.message
    });
  }
};
